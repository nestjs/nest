import { Inject, Injectable } from '@nestjs/common';
import { TransactionAdapter, TransactionContext } from '@nestjs/transaction';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { DATA_SOURCE } from './data-source.provider.js';

/**
 * Reference `TransactionAdapter` implementation for TypeORM.
 *
 * This is example/integration code, not part of `@nestjs/transaction`
 * itself — the core package has no TypeORM (or any ORM) dependency, per
 * the "core stays database-agnostic, adapters own database specifics"
 * design. A real published adapter would live in its own package (e.g.
 * `@nestjs/transaction-typeorm`); it lives here so it can be exercised
 * against a genuine TypeORM `DataSource` in this repo's integration tests.
 */
@Injectable()
export class TypeOrmTransactionAdapter implements TransactionAdapter {
  private readonly activeManager = new AsyncLocalStorage<EntityManager>();
  private readonly queryRunnersByTxId = new Map<string, QueryRunner>();

  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {}

  async begin(): Promise<TransactionContext> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const id = randomUUID();
    this.queryRunnersByTxId.set(id, queryRunner);
    return { id };
  }

  runInTransaction<T>(
    context: TransactionContext,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const queryRunner = this.getQueryRunner(context);
    return this.activeManager.run(queryRunner.manager, async () => fn());
  }

  async commit(context: TransactionContext): Promise<void> {
    const queryRunner = this.getQueryRunner(context);
    try {
      await queryRunner.commitTransaction();
    } finally {
      await queryRunner.release();
      this.queryRunnersByTxId.delete(context.id);
    }
  }

  async rollback(context: TransactionContext): Promise<void> {
    const queryRunner = this.getQueryRunner(context);
    try {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      this.queryRunnersByTxId.delete(context.id);
    }
  }

  /**
   * What a repository calls to get an `EntityManager` bound to the active
   * transaction — or the data source's default (non-transactional) manager
   * when none is active. This is TypeORM-specific plumbing entirely local
   * to this adapter; `@nestjs/transaction`'s core never sees it.
   */
  getManager(): EntityManager {
    return this.activeManager.getStore() ?? this.dataSource.manager;
  }

  private getQueryRunner(context: TransactionContext): QueryRunner {
    const queryRunner = this.queryRunnersByTxId.get(context.id);
    if (!queryRunner) {
      throw new Error(
        `No TypeORM QueryRunner registered for transaction "${context.id}".`,
      );
    }
    return queryRunner;
  }
}
