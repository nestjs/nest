import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as Sinon from 'sinon';
import { Injectable, OnApplicationListen } from '@nestjs/common';

@Injectable()
class TestInjectable implements OnApplicationListen {
	onApplicationListen = Sinon.spy();
}

describe('OnApplicationListen', () => {
	it('should call OnApplicationListen when application starts', async () => {
		const module = await Test.createTestingModule({
			providers: [TestInjectable],
		}).compile();

		const app = module.createNestApplication();
		await app.listen(3000);
		const instance = module.get(TestInjectable);
		expect(instance.onApplicationListen.called).to.be.true;
		await app.close();
	});

	it('should not throw an error when OnApplicationListen is null', async () => {
		const module = await Test.createTestingModule({
			providers: [
				{ provide: 'TEST', useValue: { onApplicationListen: null } }
			],
		}).compile();

		const app = module.createNestApplication();
		await app.listen(3000).then((obj) => expect(obj).to.not.be.undefined);
		await app.close();
	});

	it('should not throw an error when OnApplicationListen is undefined', async () => {
		const module = await Test.createTestingModule({
			providers: [
				{ provide: 'TEST', useValue: { onApplicationListen: undefined } }
			],
		}).compile();

		const app = module.createNestApplication();
		await app.listen(3000).then((obj) => expect(obj).to.not.be.undefined);
		await app.close();
	});
});
