import { Transactional } from '../transactional.decorator.js';
import { TransactionAdapterRef } from '../transaction-adapter.ref.js';
import {
  InMemoryDatabase,
  InMemoryRowsRepository,
  InMemoryTransactionAdapter,
} from './utils/in-memory-database.js';

/**
 * Proves actual atomicity — not just correctly-ordered calls to a spy.
 * `InMemoryDatabase` is a real, mutable store; a rolled-back transaction's
 * writes are genuinely absent afterwards, not merely unasserted.
 */
describe('@Transactional() — atomicity against a real (in-memory) store', () => {
  let db: InMemoryDatabase;
  let adapter: InMemoryTransactionAdapter;
  let repository: InMemoryRowsRepository;

  beforeEach(() => {
    db = new InMemoryDatabase();
    adapter = new InMemoryTransactionAdapter(db);
    repository = new InMemoryRowsRepository(db, adapter);
    TransactionAdapterRef.set(adapter);
  });

  afterEach(() => {
    TransactionAdapterRef.clear(adapter);
  });

  class OrderService {
    constructor(
      private readonly repository: InMemoryRowsRepository,
      private readonly failSecondInsert: boolean,
    ) {}

    @Transactional()
    async createOrder() {
      this.repository.insert('order');
      if (this.failSecondInsert) {
        throw new Error('inventory reservation failed');
      }
      this.repository.insert('inventory-reservation');
    }
  }

  it('commits every write when the method succeeds', async () => {
    const service = new OrderService(repository, false);

    await service.createOrder();

    expect(db.getCommittedRows()).toEqual(['order', 'inventory-reservation']);
  });

  it('rolls back every write in the transaction when a later step fails', async () => {
    const service = new OrderService(repository, true);

    await expect(service.createOrder()).rejects.toThrow(
      'inventory reservation failed',
    );

    // The first insert genuinely never reached committed state — this is
    // what makes it a proof of atomicity rather than a mock assertion.
    expect(db.getCommittedRows()).toEqual([]);
  });

  it('does not let a rolled-back write bleed into a later, unrelated transaction', async () => {
    await expect(
      new OrderService(repository, true).createOrder(),
    ).rejects.toThrow();
    await new OrderService(repository, false).createOrder();

    expect(db.getCommittedRows()).toEqual(['order', 'inventory-reservation']);
  });
});
