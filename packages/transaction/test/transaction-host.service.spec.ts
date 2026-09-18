import { TransactionHost } from '../transaction-host.service.js';
import { TransactionStorage } from '../transaction.storage.js';

describe('TransactionHost', () => {
  it('reports inactive and no context outside of any transaction', () => {
    const host = new TransactionHost();

    expect(host.isActive()).toBe(false);
    expect(host.getContext()).toBeUndefined();
    expect(TransactionHost.isActive()).toBe(false);
    expect(TransactionHost.getContext()).toBeUndefined();
  });

  it('instance and static accessors agree, and reflect the active context', () => {
    const host = new TransactionHost();
    const context = { id: 'tx-1' };

    TransactionStorage.run(context, () => {
      expect(host.isActive()).toBe(true);
      expect(host.getContext()).toBe(context);
      expect(TransactionHost.isActive()).toBe(true);
      expect(TransactionHost.getContext()).toBe(context);
    });
  });
});
