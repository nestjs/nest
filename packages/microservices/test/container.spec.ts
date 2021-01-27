import { expect } from 'chai';
import { ClientsContainer } from '../container';

describe('ClientsContainer', () => {
  let instance: ClientsContainer;
  beforeEach(() => {
    instance = new ClientsContainer();
  });
  describe('getAllClients', () => {
    it('should return array of clients', () => {
      const clients = [1, 2, 3];
      (instance as any).clients = clients;
      expect(instance.getAllClients()).to.be.eql(clients);
    });
  });
  describe('addClient', () => {
    it('should push client into clients array', () => {
      const client = 'test';
      instance.addClient(client as any);
      expect(instance.getAllClients()).to.be.deep.equal([client]);
    });
  });
  describe('clear', () => {
    it('should remove all clients', () => {
      const clients = [1, 2, 3];
      (instance as any).clients = clients;
      instance.clear();
      expect(instance.getAllClients()).to.be.deep.equal([]);
    });
  });
});
