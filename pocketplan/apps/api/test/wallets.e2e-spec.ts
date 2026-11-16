import * as request from 'supertest';
import { LedgerModule } from '../src/ledger/ledger.module';
import { createTestApp, TestApp } from './support/test-app';

interface Named {
  id: string;
  name: string;
}

// Roadmap Step 12: managing wallets and categories (PRD §6.3, §6.4).
describe('Wallets & categories (e2e)', () => {
  let t: TestApp;
  let rafi: string;
  let nusrat: string;

  const as = (token: string) => {
    const http = () => request(t.app.getHttpServer());
    const auth = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => http().get(url).set(auth),
      post: (url: string) => http().post(url).set(auth),
      put: (url: string) => http().put(url).set(auth),
      patch: (url: string) => http().patch(url).set(auth),
      delete: (url: string) => http().delete(url).set(auth),
    };
  };
  const list = async (token: string, path: string) =>
    (await as(token).get(path).expect(200)).body as Named[];
  const byName = async (token: string, path: string, name: string) =>
    (await list(token, path)).find((x) => x.name === name)!;

  beforeAll(async () => {
    t = await createTestApp([LedgerModule]);
    rafi = t.signUp('Rafi');
    nusrat = t.signUp('Nusrat');
  });

  afterAll(() => t.close());

  describe('wallets', () => {
    it('creates a wallet with an optional opening balance', async () => {
      const res = await as(rafi)
        .post('/accounts')
        .send({ name: 'City Bank', type: 'BANK', balance: 25000.5 })
        .expect(201);
      expect(res.body).toMatchObject({
        name: 'City Bank',
        type: 'BANK',
        balance: 25000.5,
      });
      const card = await as(rafi)
        .post('/accounts')
        .send({ name: 'Credit card', type: 'CARD', balance: -3200 })
        .expect(201);
      expect(card.body.balance).toBe(-3200); // a negative balance is allowed
    });

    it('renames, retypes and sets the balance', async () => {
      const bank = await byName(rafi, '/accounts', 'City Bank');
      const res = await as(rafi)
        .patch(`/accounts/${bank.id}`)
        .send({ name: '  EBL Savings ', type: 'BANK', balance: 30000 })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'EBL Savings', balance: 30000 });
      const balanceOnly = await as(rafi)
        .patch(`/accounts/${bank.id}`)
        .send({ balance: 0 })
        .expect(200);
      expect(balanceOnly.body.name).toBe('EBL Savings');
    });

    it('rejects duplicate names (any case) and bad input', async () => {
      const bank = await byName(rafi, '/accounts', 'EBL Savings');
      const dup = await as(rafi)
        .patch(`/accounts/${bank.id}`)
        .send({ name: 'cash' })
        .expect(409);
      expect(dup.body.message).toBe('You already have a wallet called Cash');
      await as(rafi)
        .post('/accounts')
        .send({ name: 'CASH', type: 'CASH' })
        .expect(409);
      const bad = await as(rafi)
        .patch(`/accounts/${bank.id}`)
        .send({ name: ' ', type: 'GOLD', balance: 1.234 })
        .expect(400);
      expect(bad.body.message).toEqual(
        expect.arrayContaining([
          'Name the wallet',
          'Pick a wallet type',
          'Balance must have at most 2 decimals',
        ]),
      );
    });

    it('refuses to delete a wallet that is in use, and says why', async () => {
      const cash = await byName(rafi, '/accounts', 'Cash');
      const food = await byName(rafi, '/categories', 'Food');
      const bills = await byName(rafi, '/categories', 'Bills');
      await as(rafi)
        .post('/expenses')
        .send({
          amount: 120,
          categoryId: food.id,
          accountId: cash.id,
          expenseDate: '2026-11-10',
        })
        .expect(201);
      await as(rafi)
        .post('/recurring-expenses?today=2026-11-13')
        .send({
          amount: 1200,
          categoryId: bills.id,
          accountId: cash.id,
          description: 'Internet',
          frequency: 'MONTHLY',
          startDate: '2026-12-01',
        })
        .expect(201);
      const res = await as(rafi).delete(`/accounts/${cash.id}`).expect(409);
      expect(res.body.message).toBe(
        'Cash is used by 1 expense and 1 recurring expense. Move or delete them first.',
      );
      expect((await list(rafi, '/expenses')).length).toBe(1); // nothing deleted
    });

    it('deletes an unused wallet', async () => {
      const card = await byName(rafi, '/accounts', 'Credit card');
      await as(rafi).delete(`/accounts/${card.id}`).expect(204);
      expect((await list(rafi, '/accounts')).map((w) => w.name)).not.toContain(
        'Credit card',
      );
    });

    it('never deletes the last wallet', async () => {
      const [only] = await list(nusrat, '/accounts');
      const res = await as(nusrat).delete(`/accounts/${only.id}`).expect(409);
      expect(res.body.message).toMatch(/at least one wallet/);
    });
  });

  describe('categories', () => {
    it('creates a custom category with an icon', async () => {
      const res = await as(rafi)
        .post('/categories')
        .send({ name: ' Rent ', icon: 'home' })
        .expect(201);
      expect(res.body).toMatchObject({ name: 'Rent', icon: 'home' });
      expect((await list(rafi, '/categories')).length).toBe(10);
    });

    it('renames and changes the icon of any category', async () => {
      const rent = await byName(rafi, '/categories', 'Rent');
      const res = await as(rafi)
        .patch(`/categories/${rent.id}`)
        .send({ name: 'House rent' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'House rent', icon: 'home' });
      const misc = await byName(rafi, '/categories', 'Miscellaneous');
      await as(rafi)
        .patch(`/categories/${misc.id}`)
        .send({ icon: 'tag' })
        .expect(200);
    });

    it('rejects duplicate names, unknown icons and blank names', async () => {
      const dup = await as(rafi)
        .post('/categories')
        .send({ name: 'food', icon: 'coffee' })
        .expect(409);
      expect(dup.body.message).toBe('You already have a category called Food');
      const bad = await as(rafi)
        .post('/categories')
        .send({ name: ' ', icon: '🍕' })
        .expect(400);
      expect(bad.body.message).toEqual(
        expect.arrayContaining(['Name the category', 'Pick an icon']),
      );
    });

    it('starts every new user with the 9 default categories', async () => {
      const fresh = t.signUp('Fresh');
      expect((await list(fresh, '/categories')).map((c) => c.name)).toEqual([
        'Food',
        'Transport',
        'Bills',
        'Shopping',
        'Health',
        'Education',
        'Entertainment',
        'Savings',
        'Miscellaneous',
      ]);
    });

    it('shows how often each category is used', async () => {
      const cats = (await as(rafi).get('/categories').expect(200)).body as {
        name: string;
        expenseCount: number;
        recurringCount: number;
      }[];
      const food = cats.find((c) => c.name === 'Food')!;
      const bills = cats.find((c) => c.name === 'Bills')!;
      expect([food.expenseCount, food.recurringCount]).toEqual([1, 0]);
      expect([bills.expenseCount, bills.recurringCount]).toEqual([0, 1]);
    });

    it('asks where to move expenses before deleting a category in use', async () => {
      const food = await byName(rafi, '/categories', 'Food');
      const res = await as(rafi).delete(`/categories/${food.id}`).expect(409);
      expect(res.body.message).toBe(
        'Food is used by 1 expense. Choose a category to move it to.',
      );
      await as(rafi)
        .delete(`/categories/${food.id}?moveTo=${food.id}`)
        .expect(400);
      await as(rafi)
        .delete(`/categories/${food.id}?moveTo=not-a-uuid`)
        .expect(400);
    });

    it('moves expenses and recurring expenses, then deletes the category', async () => {
      const shopping = await byName(rafi, '/categories', 'Shopping');
      const bills = await byName(rafi, '/categories', 'Bills');
      const misc = await byName(rafi, '/categories', 'Miscellaneous');
      const cash = await byName(rafi, '/accounts', 'Cash');
      const bag = await as(rafi)
        .post('/expenses')
        .send({
          amount: 900,
          categoryId: shopping.id,
          accountId: cash.id,
          expenseDate: '2026-11-11',
        })
        .expect(201);
      await as(rafi)
        .delete(`/categories/${shopping.id}?moveTo=${misc.id}`)
        .expect(204);
      const moved = (await list(rafi, '/expenses')).find(
        (e) => e.id === bag.body.id,
      ) as unknown as { categoryId: string };
      expect(moved.categoryId).toBe(misc.id);

      // the Internet recurring expense moves too
      await as(rafi)
        .delete(`/categories/${bills.id}?moveTo=${misc.id}`)
        .expect(204);
      const recurring = (await as(rafi).get('/recurring-expenses').expect(200))
        .body as { categoryId: string }[];
      expect(recurring.every((r) => r.categoryId === misc.id)).toBe(true);
    });

    it("never touches another user's categories", async () => {
      // Rafi removed Shopping and Bills; Nusrat still has all nine.
      const mine = (await list(rafi, '/categories')).map((c) => c.name);
      expect(mine).not.toContain('Shopping');
      expect(mine).not.toContain('Bills');
      const hers = (await list(nusrat, '/categories')).map((c) => c.name);
      expect(hers).toHaveLength(9);
      expect(hers).toEqual(expect.arrayContaining(['Shopping', 'Bills']));
    });

    it('deletes an unused category together with its budgets', async () => {
      const rent = await byName(rafi, '/categories', 'House rent');
      await as(rafi)
        .put('/budgets')
        .send({ month: '2026-11', categoryId: rent.id, plannedAmount: 18000 })
        .expect(200);
      await as(rafi).delete(`/categories/${rent.id}`).expect(204);
      const view = (await as(rafi).get('/budgets?month=2026-11').expect(200))
        .body;
      expect(view.planned).toBe(0);
      expect(
        (await list(rafi, '/categories')).map((c) => c.name),
      ).not.toContain('House rent');
    });
  });

  it("keeps each user's wallets and categories private", async () => {
    const cash = await byName(rafi, '/accounts', 'Cash');
    const food = await byName(rafi, '/categories', 'Food');
    await as(nusrat)
      .patch(`/accounts/${cash.id}`)
      .send({ name: 'Mine now' })
      .expect(404);
    await as(nusrat).delete(`/accounts/${cash.id}`).expect(404);
    await as(nusrat)
      .patch(`/categories/${food.id}`)
      .send({ name: 'Mine now' })
      .expect(404);
    await as(nusrat).delete(`/categories/${food.id}`).expect(404);
    expect((await byName(rafi, '/accounts', 'Cash')).name).toBe('Cash');
  });

  it('requires sign-in', async () => {
    const http = request(t.app.getHttpServer());
    await http.post('/categories').send({ name: 'X', icon: 'tag' }).expect(401);
  });
});
