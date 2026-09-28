import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  OutboxStorage,
  OutboxTransactionRequiredError,
  type OutboxInboxStore,
} from '@nestjs/outbox';
import { and, eq, lt } from 'drizzle-orm';
import type { Database, Transaction } from './drizzle.js';
import { outboxInbox } from './schema.js';

/** The inbox half of the order API's DrizzleOutboxStore: all a consumer-only service needs. */
@Injectable()
export class DrizzleInboxStore implements OutboxInboxStore<Transaction> {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    storage: OutboxStorage,
  ) {
    // Consumer only: the inbox is the one contract this service registers.
    storage.registerSource({ inbox: this });
  }

  async recordInbox(
    tx: Transaction | undefined,
    consumer: string,
    messageId: string,
    now: number,
  ): Promise<boolean> {
    if (
      tx !== undefined &&
      typeof (tx as Partial<Transaction>).rollback !== 'function'
    ) {
      throw new OutboxTransactionRequiredError(
        'Pass the tx that db.transaction() gives you, not the database.',
      );
    }
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
}
