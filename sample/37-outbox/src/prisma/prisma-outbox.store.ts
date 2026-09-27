import { Injectable } from '@nestjs/common';
import {
  OutboxStorage,
  OutboxTransactionRequiredError,
  type OutboxAttempt,
  type OutboxClaimRequest,
  type OutboxDeadLetter,
  type OutboxDeadLetterFilter,
  type OutboxDeadLetterQuery,
  type OutboxDeadLetterReason,
  type OutboxDeadLetterUpdate,
  type OutboxInboxStore,
  type OutboxMessage,
  type OutboxRescheduleUpdate,
  type OutboxStore,
  type OutboxStoreStats,
} from '@nestjs/outbox';
import { createHash } from 'node:crypto';
import {
  Prisma,
  type OutboxDeadLetter as DeadLetterRow,
  type OutboxMessage as MessageRow,
} from './generated/client.js';
import { PrismaService, type Transaction } from './prisma.service.js';

/** Advisory lock classes (the two-number form): any two numbers no other code of yours locks on. */
const CLAIM_LOCK = 20_260_901;
const KEY_LOCK = 20_260_902;

/** A raw query's columns, named like the models' fields. */
const MESSAGE_FIELDS = Prisma.sql`seq, id, topic, payload, headers, key, created_at AS "createdAt",
  available_at AS "availableAt", attempts, last_error AS "lastError", history,
  lease_owner AS "leaseOwner", lease_until AS "leaseUntil"`;
const DEAD_LETTER_FIELDS = Prisma.sql`id, seq, topic, payload, headers, key, created_at AS "createdAt",
  attempts, last_error AS "lastError", history, reason, failed_at AS "failedAt"`;

@Injectable()
export class PrismaOutboxStore
  implements OutboxStore<Transaction>, OutboxInboxStore<Transaction>
{
  constructor(
    private readonly prismaService: PrismaService,
    storage: OutboxStorage,
  ) {
    storage.registerSource({ messages: this, inbox: this });
  }

  async add(
    tx: Transaction,
    messages: readonly OutboxMessage[],
  ): Promise<void> {
    assertTransaction(tx);
    if (messages.length === 0) return;
    // Commit order: a transaction adding a message with the same key waits here until this
    // one commits or rolls back, so rows are numbered in the order they become visible.
    for (const lock of keyLocks(messages)) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${KEY_LOCK}::int, ${lock}::int)`;
    }
    await tx.outboxMessage.createMany({
      data: messages.map(message => ({
        id: message.id,
        topic: message.topic,
        payload: toJson(message.payload),
        headers: message.headers,
        key: message.key,
        createdAt: new Date(message.createdAt),
        availableAt: new Date(message.availableAt),
      })),
    });
  }

  claim({
    owner,
    now,
    leaseMs,
    limit,
  }: OutboxClaimRequest): Promise<OutboxMessage[]> {
    return this.prismaService.$transaction(
      async tx => {
        // Claims take turns, so each one sees the leases of the one before it.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAIM_LOCK}::int, 0)`;
        // Due rows in seq order, stopping at `limit` claimable ones: a primary-key index scan,
        // whatever the backlog. SKIP LOCKED passes over a row a relay is writing right now.
        const due = await tx.$queryRaw<{ seq: bigint }[]>`
          SELECT seq FROM outbox_messages AS message
          WHERE ${claimable(now)}
          ORDER BY seq
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED`;
        if (due.length === 0) return [];
        const seqs = due.map(row => row.seq);
        await tx.outboxMessage.updateMany({
          where: { seq: { in: seqs } },
          data: { leaseOwner: owner, leaseUntil: new Date(now + leaseMs) },
        });

        // A last look before committing: each claimed row's predecessor in its key must be
        // ours too. A row whose older sibling was skipped as locked, or came back meanwhile (a
        // dead letter requeued right then), goes back with the rest of its key.
        const rows = await tx.$queryRaw<
          (MessageRow & { behindOther: boolean | null })[]
        >`
          SELECT ${MESSAGE_FIELDS}, (
            SELECT older.lease_owner IS DISTINCT FROM ${owner}
            FROM outbox_messages AS older
            WHERE older.key = message.key AND older.seq < message.seq
            ORDER BY older.seq DESC
            LIMIT 1
          ) AS "behindOther"
          FROM outbox_messages AS message
          WHERE seq IN (${Prisma.join(seqs)})
          ORDER BY seq`;
        const blocked = new Set<string>();
        const giveBack: bigint[] = [];
        const batch: OutboxMessage[] = [];
        for (const { behindOther, ...row } of rows) {
          if (
            row.key !== null &&
            (behindOther === true || blocked.has(row.key))
          ) {
            blocked.add(row.key);
            giveBack.push(row.seq);
          } else {
            batch.push(toMessage(row));
          }
        }
        if (giveBack.length > 0) {
          await tx.outboxMessage.updateMany({
            where: { seq: { in: giveBack } },
            data: { leaseOwner: null, leaseUntil: null },
          });
        }
        return batch;
      },
      // Each statement sees what committed before it started (PostgreSQL's default).
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async markPublished(id: string, owner: string): Promise<boolean> {
    const { count } = await this.prismaService.outboxMessage.deleteMany({
      where: leasedBy(id, owner),
    });
    return count === 1;
  }

  async reschedule(
    id: string,
    owner: string,
    update: OutboxRescheduleUpdate,
  ): Promise<boolean> {
    // Raw, because Prisma Client can't append to a JSON array: one statement that checks
    // the lease and appends, so there is no read and no lost update.
    const updated = await this.prismaService.$executeRaw`
      UPDATE outbox_messages
      SET attempts = ${update.attempts},
          available_at = ${new Date(update.availableAt)},
          last_error = ${update.error.error},
          history = history || ${JSON.stringify([update.error])}::jsonb,
          lease_owner = NULL,
          lease_until = NULL
      WHERE id = ${id} AND lease_owner = ${owner}`;
    return updated === 1;
  }

  deadLetter(
    id: string,
    owner: string,
    update: OutboxDeadLetterUpdate,
  ): Promise<boolean> {
    return this.prismaService.$transaction(async tx => {
      // delete() with the lease in its where: one DELETE ... WHERE id AND lease_owner RETURNING.
      const row = await tx.outboxMessage
        .delete({ where: leasedBy(id, owner) })
        .catch(ifNotFound(null));
      if (!row) return false;
      const deadLetter = {
        seq: row.seq,
        topic: row.topic,
        payload: toJson(row.payload),
        headers: row.headers as Prisma.InputJsonObject,
        key: row.key,
        createdAt: row.createdAt,
        attempts: update.attempts,
        lastError: update.error.error,
        history: [
          ...(row.history as unknown as OutboxAttempt[]),
          update.error,
        ] as unknown as Prisma.InputJsonArray,
        reason: update.reason,
        failedAt: new Date(update.failedAt),
      };
      // Replaces an earlier dead letter with this id (a producer that reused a custom id).
      await tx.outboxDeadLetter.upsert({
        where: { id: row.id },
        create: { id: row.id, ...deadLetter },
        update: deadLetter,
      });
      return true;
    });
  }

  async release(ids: readonly string[], owner: string): Promise<number> {
    const { count } = await this.prismaService.outboxMessage.updateMany({
      where: { id: { in: [...ids] }, leaseOwner: owner },
      data: { leaseOwner: null, leaseUntil: null },
    });
    return count;
  }

  async stats(now: number): Promise<OutboxStoreStats> {
    const at = new Date(now);
    const [pending, [ready], leased, deadLetters, [oldest]] = await Promise.all(
      [
        this.prismaService.outboxMessage.count(),
        this.prismaService.$queryRaw<{ count: number }[]>`
        SELECT count(*)::int AS count FROM outbox_messages AS message WHERE ${claimable(now)}`,
        this.prismaService.outboxMessage.count({
          where: { leaseUntil: { gt: at } },
        }),
        this.prismaService.outboxDeadLetter.count(),
        // Waiting since it became due; once an attempt failed, since it was added.
        this.prismaService.$queryRaw<{ dueAt: Date | null }[]>`
        SELECT min(CASE WHEN attempts > 0 THEN created_at
                        WHEN available_at <= ${at} THEN available_at END) AS "dueAt"
        FROM outbox_messages`,
      ],
    );
    return {
      pending,
      ready: ready!.count,
      leased,
      deadLetters,
      oldestDueAt: oldest?.dueAt?.getTime() ?? null,
    };
  }

  async listDeadLetters({
    topic,
    key,
    limit = 50,
    offset = 0,
  }: OutboxDeadLetterQuery): Promise<OutboxDeadLetter[]> {
    const rows = await this.prismaService.outboxDeadLetter.findMany({
      where: { topic, key },
      orderBy: [{ failedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip: offset,
    });
    return rows.map(toDeadLetter);
  }

  async getDeadLetter(id: string): Promise<OutboxDeadLetter | undefined> {
    const row = await this.prismaService.outboxDeadLetter.findUnique({
      where: { id },
    });
    return row ? toDeadLetter(row) : undefined;
  }

  requeueDeadLetters(
    filter: OutboxDeadLetterFilter,
    now: number,
  ): Promise<number> {
    const where = deadLetterFilter(filter);
    return this.prismaService.$transaction(async tx => {
      // Raw, because Prisma Client's deleteMany() returns a count, not the rows: take the
      // dead letters in one statement, so a concurrent requeue or purge can't take them too.
      const rows = await tx.$queryRaw<DeadLetterRow[]>`
        DELETE FROM outbox_dead_letters WHERE ${where} RETURNING ${DEAD_LETTER_FIELDS}`;
      if (rows.length === 0) return 0;
      // The original seq: back ahead of the messages added after it, with the same key.
      await tx.outboxMessage.createMany({
        data: rows.map(row => ({
          seq: row.seq,
          id: row.id,
          topic: row.topic,
          payload: toJson(row.payload),
          headers: row.headers as Prisma.InputJsonObject,
          key: row.key,
          createdAt: row.createdAt,
          availableAt: new Date(now),
          lastError: row.lastError,
          history: row.history as Prisma.InputJsonArray,
        })),
      });
      return rows.length;
    });
  }

  async purgeDeadLetters(filter: OutboxDeadLetterFilter): Promise<number> {
    return await this.prismaService
      .$executeRaw`DELETE FROM outbox_dead_letters WHERE ${deadLetterFilter(filter)}`;
  }

  async recordInbox(
    tx: Transaction | undefined,
    consumer: string,
    messageId: string,
    now: number,
  ): Promise<boolean> {
    if (tx !== undefined) assertTransaction(tx);
    // INSERT ... ON CONFLICT DO NOTHING on the unique key: a concurrent delivery waits for
    // this transaction. The count says whether this call inserted the record.
    const { count } = await (tx ?? this.prismaService).outboxInbox.createMany({
      data: { consumer, messageId, processedAt: new Date(now) },
      skipDuplicates: true,
    });
    return count === 1;
  }

  async hasInbox(consumer: string, messageId: string): Promise<boolean> {
    const found = await this.prismaService.outboxInbox.count({
      where: { consumer, messageId },
    });
    return found > 0;
  }

  async pruneInbox(before: number): Promise<number> {
    const { count } = await this.prismaService.outboxInbox.deleteMany({
      where: { processedAt: { lt: new Date(before) } },
    });
    return count;
  }
}

/**
 * Due, unleased, and no older message with the same key is delayed or leased (on
 * `outbox_messages AS message`). The NOT EXISTS probes the (key, seq) index from the key's
 * oldest row.
 */
function claimable(now: number): Prisma.Sql {
  const at = new Date(now);
  return Prisma.sql`message.available_at <= ${at}
    AND (message.lease_until IS NULL OR message.lease_until <= ${at})
    AND (message.key IS NULL OR NOT EXISTS (
      SELECT 1 FROM outbox_messages AS older
      WHERE older.key = message.key AND older.seq < message.seq
        AND (older.available_at > ${at} OR older.lease_until > ${at})))`;
}

/**
 * A transaction client lacks the root client's `$connect()`. (Both have `$transaction()`:
 * on a transaction client, it nests.)
 */
function assertTransaction(tx: Transaction) {
  if (
    typeof (tx as Partial<PrismaService> | undefined)?.$connect ===
      'function' ||
    tx === undefined ||
    tx === null
  ) {
    throw new OutboxTransactionRequiredError(
      'Pass the tx that prisma.$transaction(async (tx) => ...) gives you, not the client.',
    );
  }
}

/** One lock per key, sorted, so two transactions locking the same keys can't deadlock. */
function keyLocks(messages: readonly OutboxMessage[]): number[] {
  const keys = new Set(
    messages.flatMap(message => (message.key === null ? [] : [message.key])),
  );
  const locks = [...keys].map(key =>
    createHash('sha256').update(key).digest().readInt32BE(0),
  );
  return [...new Set(locks)].sort((a, b) => a - b);
}

/** The message, if `owner` still holds its lease: every relay write is fenced by it. */
function leasedBy(id: string, owner: string) {
  return {
    id,
    leaseOwner: owner,
  } satisfies Prisma.OutboxMessageWhereUniqueInput;
}

/** The filter's fields combined with AND; an empty filter is refused unless it says `all`. */
function deadLetterFilter({
  ids,
  topic,
  key,
  failedBefore,
  all,
}: OutboxDeadLetterFilter): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (ids)
    conditions.push(
      ids.length === 0
        ? Prisma.sql`FALSE`
        : Prisma.sql`id IN (${Prisma.join(ids)})`,
    );
  if (topic !== undefined) conditions.push(Prisma.sql`topic = ${topic}`);
  if (key !== undefined) conditions.push(Prisma.sql`key = ${key}`);
  if (failedBefore !== undefined)
    conditions.push(Prisma.sql`failed_at < ${new Date(+failedBefore)}`);
  if (conditions.length === 0 && !all) {
    throw new Error('Refusing an empty dead-letter filter; pass { all: true }');
  }
  return conditions.length === 0
    ? Prisma.sql`TRUE`
    : Prisma.join(conditions, ' AND ');
}

/** `null` is stored as SQL NULL: Prisma needs `Prisma.DbNull` to write it. */
function toJson(value: unknown) {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

/** Turns Prisma's "record to delete does not exist" (P2025) into `fallback`. */
function ifNotFound<T>(fallback: T) {
  return (error: unknown): T => {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    )
      return fallback;
    throw error;
  };
}

function toMessage(row: MessageRow): OutboxMessage {
  return {
    id: row.id,
    topic: row.topic,
    payload: row.payload,
    headers: row.headers as Record<string, string>,
    key: row.key,
    createdAt: row.createdAt.getTime(),
    availableAt: row.availableAt.getTime(),
    attempts: row.attempts,
    lastError: row.lastError,
  };
}

function toDeadLetter(row: DeadLetterRow): OutboxDeadLetter {
  return {
    id: row.id,
    topic: row.topic,
    payload: row.payload,
    headers: row.headers as Record<string, string>,
    key: row.key,
    createdAt: row.createdAt.getTime(),
    attempts: row.attempts,
    lastError: row.lastError,
    reason: row.reason as OutboxDeadLetterReason,
    failedAt: row.failedAt.getTime(),
    history: row.history as unknown as OutboxAttempt[],
  };
}
