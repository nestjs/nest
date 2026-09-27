import { Injectable } from '@nestjs/common';
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
import { createHash } from 'node:crypto';
import {
  DataSource,
  EntityManager,
  In,
  LessThan,
  MoreThan,
  type FindOptionsWhere,
  type SelectQueryBuilder,
} from 'typeorm';
import {
  OutboxDeadLetterEntity,
  OutboxInboxEntity,
  OutboxMessageEntity,
  type Json,
} from './outbox.entities.js';

/** Advisory lock classes (the two-number form): any two numbers no other code of yours locks on. */
const CLAIM_LOCK = 20_260_901;
const KEY_LOCK = 20_260_902;

@Injectable()
export class TypeOrmOutboxStore
  implements OutboxStore<EntityManager>, OutboxInboxStore<EntityManager>
{
  constructor(
    private readonly dataSource: DataSource,
    storage: OutboxStorage,
  ) {
    storage.registerSource({ messages: this, inbox: this });
  }

  async add(
    tx: EntityManager,
    messages: readonly OutboxMessage[],
  ): Promise<void> {
    assertTransaction(tx);
    if (messages.length === 0) return;
    // Commit order: a transaction adding a message with the same key waits here until this
    // one commits or rolls back, so rows are numbered in the order they become visible.
    for (const lock of keyLocks(messages)) {
      await tx.query('SELECT pg_advisory_xact_lock($1::int, $2::int)', [
        KEY_LOCK,
        lock,
      ]);
    }
    await tx.insert(
      OutboxMessageEntity,
      messages.map(message => ({
        id: message.id,
        topic: message.topic,
        payload: message.payload as Json, // JSON-safe: Outbox.add() took a JSON snapshot
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
    // Each statement sees what committed before it started (PostgreSQL's default).
    return this.dataSource.transaction('READ COMMITTED', async manager => {
      // Claims take turns, so each one sees the leases of the one before it.
      await manager.query('SELECT pg_advisory_xact_lock($1::int, 0)', [
        CLAIM_LOCK,
      ]);
      // Due rows in seq order, stopping at `limit` claimable ones: a primary-key index scan,
      // whatever the backlog. SKIP LOCKED passes over a row a relay is writing right now.
      const due = await this.claimable(manager, now)
        .select('message.seq', 'seq')
        .orderBy('message.seq')
        .limit(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getRawMany<{ seq: string }>();
      if (due.length === 0) return [];
      const seqs = due.map(row => row.seq);
      await manager.update(
        OutboxMessageEntity,
        { seq: In(seqs) },
        { leaseOwner: owner, leaseUntil: new Date(now + leaseMs) },
      );

      // A last look before committing: each claimed row's predecessor in its key must be
      // ours too. A row whose older sibling was skipped as locked, or came back meanwhile (a
      // dead letter requeued right then), goes back with the rest of its key.
      const { entities, raw } = await manager
        .createQueryBuilder(OutboxMessageEntity, 'message')
        .addSelect(
          previous =>
            previous
              .select('older.leaseOwner IS DISTINCT FROM :owner')
              .from(OutboxMessageEntity, 'older')
              .where('older.key = message.key')
              .andWhere('older.seq < message.seq')
              .orderBy('older.seq', 'DESC')
              .limit(1),
          'behind_other',
        )
        .where({ seq: In(seqs) })
        .orderBy('message.seq')
        .setParameter('owner', owner)
        .getRawAndEntities<{
          message_seq: string;
          behind_other: boolean | null;
        }>();
      const behindOther = new Map(
        raw.map(row => [row.message_seq, row.behind_other]),
      );
      const blocked = new Set<string>();
      const giveBack: string[] = [];
      const batch: OutboxMessage[] = [];
      for (const row of entities) {
        if (
          row.key !== null &&
          (behindOther.get(row.seq) === true || blocked.has(row.key))
        ) {
          blocked.add(row.key);
          giveBack.push(row.seq);
        } else {
          batch.push(toMessage(row));
        }
      }
      if (giveBack.length > 0) {
        await manager.update(
          OutboxMessageEntity,
          { seq: In(giveBack) },
          { leaseOwner: null, leaseUntil: null },
        );
      }
      return batch;
    });
  }

  async markPublished(id: string, owner: string): Promise<boolean> {
    const { affected } = await this.dataSource.manager.delete(
      OutboxMessageEntity,
      leasedBy(id, owner),
    );
    return affected === 1;
  }

  async reschedule(
    id: string,
    owner: string,
    update: OutboxRescheduleUpdate,
  ): Promise<boolean> {
    const { affected } = await this.dataSource
      .createQueryBuilder()
      .update(OutboxMessageEntity)
      .set({
        attempts: update.attempts,
        availableAt: new Date(update.availableAt),
        lastError: update.error.error,
        // Appends in the statement that checks the lease: no read, no lost update.
        history: () => 'history || CAST(:attempt AS jsonb)',
        leaseOwner: null,
        leaseUntil: null,
      })
      .where(leasedBy(id, owner))
      .setParameter('attempt', JSON.stringify([update.error]))
      .execute();
    return affected === 1;
  }

  deadLetter(
    id: string,
    owner: string,
    update: OutboxDeadLetterUpdate,
  ): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      // SELECT ... FOR UPDATE: PostgreSQL checks the lease on the locked row, and nobody
      // else can change it before this transaction ends.
      const row = await manager.findOne(OutboxMessageEntity, {
        where: leasedBy(id, owner),
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) return false;
      await manager.delete(OutboxMessageEntity, { seq: row.seq });
      // Replaces an earlier dead letter with this id (a producer that reused a custom id).
      await manager.upsert(
        OutboxDeadLetterEntity,
        {
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
        },
        ['id'],
      );
      return true;
    });
  }

  async release(ids: readonly string[], owner: string): Promise<number> {
    if (ids.length === 0) return 0;
    const { affected } = await this.dataSource.manager.update(
      OutboxMessageEntity,
      { id: In([...ids]), leaseOwner: owner },
      { leaseOwner: null, leaseUntil: null },
    );
    return affected ?? 0;
  }

  async stats(now: number): Promise<OutboxStoreStats> {
    const at = new Date(now);
    const manager = this.dataSource.manager;
    const [pending, ready, leased, deadLetters, oldest] = await Promise.all([
      manager.count(OutboxMessageEntity),
      this.claimable(manager, now).getCount(),
      manager.countBy(OutboxMessageEntity, { leaseUntil: MoreThan(at) }),
      manager.count(OutboxDeadLetterEntity),
      // Waiting since it became due; once an attempt failed, since it was added.
      manager
        .createQueryBuilder(OutboxMessageEntity, 'message')
        .select(
          'MIN(CASE WHEN message.attempts > 0 THEN message.createdAt WHEN message.availableAt <= :at THEN message.availableAt END)',
          'dueAt',
        )
        .setParameter('at', at)
        .getRawOne<{ dueAt: Date | null }>(),
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
    const rows = await this.dataSource.manager.find(OutboxDeadLetterEntity, {
      // TypeORM refuses `undefined` in a where object: leave the fields out instead.
      where: {
        ...(topic !== undefined && { topic }),
        ...(key !== undefined && { key }),
      },
      order: { failedAt: 'DESC', id: 'DESC' },
      take: limit,
      skip: offset,
    });
    return rows.map(toDeadLetter);
  }

  async getDeadLetter(id: string): Promise<OutboxDeadLetter | undefined> {
    const row = await this.dataSource.manager.findOneBy(
      OutboxDeadLetterEntity,
      { id },
    );
    return row ? toDeadLetter(row) : undefined;
  }

  requeueDeadLetters(
    filter: OutboxDeadLetterFilter,
    now: number,
  ): Promise<number> {
    const where = deadLetterFilter(filter);
    if (!where) return Promise.resolve(0);
    return this.dataSource.transaction(async manager => {
      // Locked, so a concurrent requeue or purge waits and then finds them gone.
      const rows = await manager.find(OutboxDeadLetterEntity, {
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (rows.length === 0) return 0;
      await manager.delete(OutboxDeadLetterEntity, {
        id: In(rows.map(row => row.id)),
      });
      // The original seq: back ahead of the messages added after it, with the same key.
      await manager.insert(
        OutboxMessageEntity,
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
    const where = deadLetterFilter(filter);
    if (!where) return 0;
    const purge = this.dataSource
      .createQueryBuilder()
      .delete()
      .from(OutboxDeadLetterEntity);
    // TypeORM refuses an empty where: `{ all: true }` deletes without one, on purpose.
    const { affected } = await (
      Object.keys(where).length === 0 ? purge : purge.where(where)
    ).execute();
    return affected ?? 0;
  }

  async recordInbox(
    tx: EntityManager | undefined,
    consumer: string,
    messageId: string,
    now: number,
  ): Promise<boolean> {
    if (tx !== undefined) assertTransaction(tx);
    // One statement on the unique key: a concurrent delivery waits for this transaction.
    const { raw } = await (tx ?? this.dataSource.manager)
      .createQueryBuilder()
      .insert()
      .into(OutboxInboxEntity)
      .values({ consumer, messageId, processedAt: new Date(now) })
      .orIgnore()
      .returning(['consumer'])
      .updateEntity(false)
      .execute();
    return (raw as unknown[]).length === 1;
  }

  hasInbox(consumer: string, messageId: string): Promise<boolean> {
    return this.dataSource.manager.existsBy(OutboxInboxEntity, {
      consumer,
      messageId,
    });
  }

  async pruneInbox(before: number): Promise<number> {
    const { affected } = await this.dataSource.manager.delete(
      OutboxInboxEntity,
      { processedAt: LessThan(new Date(before)) },
    );
    return affected ?? 0;
  }

  /**
   * Due, unleased, and no older message with the same key is delayed or leased. The
   * NOT EXISTS probes the (key, seq) index from the key's oldest row.
   */
  private claimable(
    manager: EntityManager,
    now: number,
  ): SelectQueryBuilder<OutboxMessageEntity> {
    return manager
      .createQueryBuilder(OutboxMessageEntity, 'message')
      .where('message.availableAt <= :now')
      .andWhere('(message.leaseUntil IS NULL OR message.leaseUntil <= :now)')
      .andWhere(query => {
        const blocking = query
          .subQuery()
          .select('1')
          .from(OutboxMessageEntity, 'older')
          .where('older.key = message.key')
          .andWhere('older.seq < message.seq')
          .andWhere('(older.availableAt > :now OR older.leaseUntil > :now)')
          .getQuery();
        return `(message.key IS NULL OR NOT EXISTS ${blocking})`;
      })
      .setParameter('now', new Date(now));
  }
}

/** A transaction's EntityManager has an active query runner; `dataSource.manager` has none. */
function assertTransaction(tx: EntityManager) {
  if (!(tx instanceof EntityManager) || !tx.queryRunner?.isTransactionActive) {
    throw new OutboxTransactionRequiredError(
      'Pass the EntityManager that dataSource.transaction() gives you, not dataSource.manager.',
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
function leasedBy(
  id: string,
  owner: string,
): FindOptionsWhere<OutboxMessageEntity> {
  return { id, leaseOwner: owner };
}

/**
 * The filter's fields combined with AND; an empty filter is refused unless it says `all`.
 * `undefined` when it matches nothing (`ids: []`).
 */
function deadLetterFilter({
  ids,
  topic,
  key,
  failedBefore,
  all,
}: OutboxDeadLetterFilter) {
  const where: FindOptionsWhere<OutboxDeadLetterEntity> = {};
  if (ids) {
    if (ids.length === 0) return undefined;
    where.id = In(ids);
  }
  if (topic !== undefined) where.topic = topic;
  if (key !== undefined) where.key = key;
  if (failedBefore !== undefined)
    where.failedAt = LessThan(new Date(+failedBefore));
  if (Object.keys(where).length === 0 && !all) {
    throw new Error('Refusing an empty dead-letter filter; pass { all: true }');
  }
  return where;
}

function toMessage(row: OutboxMessageEntity): OutboxMessage {
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

function toDeadLetter(row: OutboxDeadLetterEntity): OutboxDeadLetter {
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
