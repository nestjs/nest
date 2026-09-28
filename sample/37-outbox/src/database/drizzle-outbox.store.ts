import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  OutboxStorage,
  OutboxTransactionRequiredError,
  type OutboxClaimRequest,
  type OutboxDeadLetter,
  type OutboxDeadLetterFilter,
  type OutboxDeadLetterQuery,
  type OutboxDeadLetterUpdate,
  type OutboxInboxStore,
  type OutboxMessage,
  type OutboxRescheduleUpdate,
  type OutboxStore,
  type OutboxStoreStats,
} from '@nestjs/outbox';
import {
  and,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { createHash } from 'node:crypto';
import type { Database, Transaction } from './drizzle.js';
import { outboxDeadLetters, outboxInbox, outboxMessages } from './schema.js';

/** Advisory lock classes (the two-number form): any two numbers no other code of yours locks on. */
const CLAIM_LOCK = 20_260_901;
const KEY_LOCK = 20_260_902;

@Injectable()
export class DrizzleOutboxStore
  implements OutboxStore<Transaction>, OutboxInboxStore<Transaction>
{
  constructor(
    @InjectDrizzle() private readonly db: Database,
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
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${KEY_LOCK}::int, ${lock}::int)`,
      );
    }
    await tx.insert(outboxMessages).values(
      messages.map(message => ({
        id: message.id,
        topic: message.topic,
        payload: message.payload,
        headers: message.headers,
        key: message.key,
        createdAt: new Date(message.createdAt),
        availableAt: new Date(message.availableAt),
      })),
    );
  }

  claim({
    owner,
    now,
    leaseMs,
    limit,
  }: OutboxClaimRequest): Promise<OutboxMessage[]> {
    return this.db.transaction(
      async tx => {
        // Claims take turns, so each one sees the leases of the one before it.
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(${CLAIM_LOCK}::int, 0)`,
        );
        // Due rows in seq order, stopping at `limit` claimable ones: a primary-key index scan,
        // whatever the backlog. SKIP LOCKED passes over a row a relay is writing right now.
        const due = await tx
          .select({ seq: outboxMessages.seq })
          .from(outboxMessages)
          .where(this.claimable(now))
          .orderBy(outboxMessages.seq)
          .limit(limit)
          .for('update', { skipLocked: true });
        if (due.length === 0) return [];
        const seqs = due.map(row => row.seq);
        await tx
          .update(outboxMessages)
          .set({ leaseOwner: owner, leaseUntil: new Date(now + leaseMs) })
          .where(inArray(outboxMessages.seq, seqs));

        // A last look before committing: each claimed row's predecessor in its key must be
        // ours too. A row whose older sibling was skipped as locked, or came back meanwhile (a
        // dead letter requeued right then), goes back with the rest of its key.
        const previous = alias(outboxMessages, 'previous');
        const rows = await tx
          .select({
            ...getTableColumns(outboxMessages),
            behindOther: sql<boolean | null>`(${tx
              .select({
                other: sql`${previous.leaseOwner} IS DISTINCT FROM ${owner}`,
              })
              .from(previous)
              .where(
                and(
                  eq(previous.key, outboxMessages.key),
                  lt(previous.seq, outboxMessages.seq),
                ),
              )
              .orderBy(desc(previous.seq))
              .limit(1)})`,
          })
          .from(outboxMessages)
          .where(inArray(outboxMessages.seq, seqs))
          .orderBy(outboxMessages.seq);
        const blocked = new Set<string>();
        const giveBack: number[] = [];
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
          await tx
            .update(outboxMessages)
            .set({ leaseOwner: null, leaseUntil: null })
            .where(inArray(outboxMessages.seq, giveBack));
        }
        return batch;
      },
      // Each statement sees what committed before it started (PostgreSQL's default).
      { isolationLevel: 'read committed' },
    );
  }

  async markPublished(id: string, owner: string): Promise<boolean> {
    const deleted = await this.db
      .delete(outboxMessages)
      .where(leasedBy(id, owner))
      .returning({ id: outboxMessages.id });
    return deleted.length === 1;
  }

  async reschedule(
    id: string,
    owner: string,
    update: OutboxRescheduleUpdate,
  ): Promise<boolean> {
    const updated = await this.db
      .update(outboxMessages)
      .set({
        attempts: update.attempts,
        availableAt: new Date(update.availableAt),
        lastError: update.error.error,
        history: sql`${outboxMessages.history} || ${JSON.stringify([update.error])}::jsonb`,
        leaseOwner: null,
        leaseUntil: null,
      })
      .where(leasedBy(id, owner))
      .returning({ id: outboxMessages.id });
    return updated.length === 1;
  }

  deadLetter(
    id: string,
    owner: string,
    update: OutboxDeadLetterUpdate,
  ): Promise<boolean> {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .delete(outboxMessages)
        .where(leasedBy(id, owner))
        .returning();
      if (!row) return false;
      const deadLetter = {
        id: row.id,
        seq: row.seq,
        topic: row.topic,
        payload: row.payload,
        headers: row.headers,
        key: row.key,
        createdAt: row.createdAt,
        attempts: update.attempts,
        lastError: update.error.error,
        history: [...row.history, update.error],
        reason: update.reason,
        failedAt: new Date(update.failedAt),
      };
      // Replaces an earlier dead letter with this id (a producer that reused a custom id).
      await tx
        .insert(outboxDeadLetters)
        .values(deadLetter)
        .onConflictDoUpdate({ target: outboxDeadLetters.id, set: deadLetter });
      return true;
    });
  }

  async release(ids: readonly string[], owner: string): Promise<number> {
    const released = await this.db
      .update(outboxMessages)
      .set({ leaseOwner: null, leaseUntil: null })
      .where(
        and(
          eq(outboxMessages.leaseOwner, owner),
          inArray(outboxMessages.id, [...ids]),
        ),
      )
      .returning({ id: outboxMessages.id });
    return released.length;
  }

  async stats(now: number): Promise<OutboxStoreStats> {
    const at = new Date(now);
    const [pending, ready, leased, deadLetters, [oldest]] = await Promise.all([
      this.db.$count(outboxMessages),
      this.db.$count(outboxMessages, this.claimable(now)),
      this.db.$count(outboxMessages, gt(outboxMessages.leaseUntil, at)),
      this.db.$count(outboxDeadLetters),
      // Waiting since it became due; once an attempt failed, since it was added.
      this.db
        .select({
          dueAt: sql<Date | null>`min(CASE
            WHEN ${gt(outboxMessages.attempts, 0)} THEN ${outboxMessages.createdAt}
            WHEN ${lte(outboxMessages.availableAt, at)} THEN ${outboxMessages.availableAt} END)`.mapWith(
            outboxMessages.createdAt,
          ),
        })
        .from(outboxMessages),
    ]);
    return {
      pending,
      ready,
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
    const rows = await this.db
      .select()
      .from(outboxDeadLetters)
      .where(
        and(
          topic === undefined ? undefined : eq(outboxDeadLetters.topic, topic),
          key === undefined ? undefined : eq(outboxDeadLetters.key, key),
        ),
      )
      .orderBy(desc(outboxDeadLetters.failedAt), desc(outboxDeadLetters.id))
      .limit(limit)
      .offset(offset);
    return rows.map(toDeadLetter);
  }

  async getDeadLetter(id: string): Promise<OutboxDeadLetter | undefined> {
    const [row] = await this.db
      .select()
      .from(outboxDeadLetters)
      .where(eq(outboxDeadLetters.id, id));
    return row && toDeadLetter(row);
  }

  requeueDeadLetters(
    filter: OutboxDeadLetterFilter,
    now: number,
  ): Promise<number> {
    const where = deadLetterFilter(filter);
    return this.db.transaction(async tx => {
      const rows = await tx.delete(outboxDeadLetters).where(where).returning();
      if (rows.length === 0) return 0;
      // The original seq: back ahead of the messages added after it, with the same key.
      await tx.insert(outboxMessages).values(
        rows.map(row => ({
          seq: row.seq,
          id: row.id,
          topic: row.topic,
          payload: row.payload,
          headers: row.headers,
          key: row.key,
          createdAt: row.createdAt,
          availableAt: new Date(now),
          lastError: row.lastError,
          history: row.history,
        })),
      );
      return rows.length;
    });
  }

  async purgeDeadLetters(filter: OutboxDeadLetterFilter): Promise<number> {
    const purged = await this.db
      .delete(outboxDeadLetters)
      .where(deadLetterFilter(filter))
      .returning({ id: outboxDeadLetters.id });
    return purged.length;
  }

  async recordInbox(
    tx: Transaction | undefined,
    consumer: string,
    messageId: string,
    now: number,
  ): Promise<boolean> {
    if (tx !== undefined) assertTransaction(tx);
    // One statement on the unique key: a concurrent delivery waits for this transaction.
    const inserted = await (tx ?? this.db)
      .insert(outboxInbox)
      .values({ consumer, messageId, processedAt: new Date(now) })
      .onConflictDoNothing()
      .returning({ consumer: outboxInbox.consumer });
    return inserted.length === 1;
  }

  async hasInbox(consumer: string, messageId: string): Promise<boolean> {
    const found = await this.db.$count(
      outboxInbox,
      and(
        eq(outboxInbox.consumer, consumer),
        eq(outboxInbox.messageId, messageId),
      ),
    );
    return found > 0;
  }

  async pruneInbox(before: number): Promise<number> {
    const pruned = await this.db
      .delete(outboxInbox)
      .where(lt(outboxInbox.processedAt, new Date(before)))
      .returning({ consumer: outboxInbox.consumer });
    return pruned.length;
  }

  /**
   * Due, unleased, and no older message with the same key is delayed or leased. The
   * NOT EXISTS probes the (key, seq) index from the key's oldest row.
   */
  private claimable(now: number): SQL {
    const at = new Date(now);
    const older = alias(outboxMessages, 'older');
    return and(
      lte(outboxMessages.availableAt, at),
      or(isNull(outboxMessages.leaseUntil), lte(outboxMessages.leaseUntil, at)),
      or(
        isNull(outboxMessages.key),
        notExists(
          this.db
            .select({ one: sql`1` })
            .from(older)
            .where(
              and(
                eq(older.key, outboxMessages.key),
                lt(older.seq, outboxMessages.seq),
                or(gt(older.availableAt, at), gt(older.leaseUntil, at)),
              ),
            ),
        ),
      ),
    )!;
  }
}

/** Drizzle's `tx` has rollback(); the database itself doesn't, and would write outside the transaction. */
function assertTransaction(tx: Transaction) {
  if (
    typeof (tx as Partial<Transaction> | undefined)?.rollback !== 'function'
  ) {
    throw new OutboxTransactionRequiredError(
      'Pass the tx that db.transaction() gives you, not the database.',
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
function leasedBy(id: string, owner: string): SQL {
  return and(eq(outboxMessages.id, id), eq(outboxMessages.leaseOwner, owner))!;
}

/** The filter's fields combined with AND; an empty filter is refused unless it says `all`. */
function deadLetterFilter({
  ids,
  topic,
  key,
  failedBefore,
  all,
}: OutboxDeadLetterFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (ids) conditions.push(inArray(outboxDeadLetters.id, ids));
  if (topic !== undefined) conditions.push(eq(outboxDeadLetters.topic, topic));
  if (key !== undefined) conditions.push(eq(outboxDeadLetters.key, key));
  if (failedBefore !== undefined)
    conditions.push(lt(outboxDeadLetters.failedAt, new Date(+failedBefore)));
  if (conditions.length === 0 && !all) {
    throw new Error('Refusing an empty dead-letter filter; pass { all: true }');
  }
  return and(...conditions);
}

function toMessage(row: typeof outboxMessages.$inferSelect): OutboxMessage {
  return {
    id: row.id,
    topic: row.topic,
    payload: row.payload,
    headers: row.headers,
    key: row.key,
    createdAt: row.createdAt.getTime(),
    availableAt: row.availableAt.getTime(),
    attempts: row.attempts,
    lastError: row.lastError,
  };
}

function toDeadLetter(
  row: typeof outboxDeadLetters.$inferSelect,
): OutboxDeadLetter {
  return {
    id: row.id,
    topic: row.topic,
    payload: row.payload,
    headers: row.headers,
    key: row.key,
    createdAt: row.createdAt.getTime(),
    attempts: row.attempts,
    lastError: row.lastError,
    reason: row.reason,
    failedAt: row.failedAt.getTime(),
    history: row.history,
  };
}
