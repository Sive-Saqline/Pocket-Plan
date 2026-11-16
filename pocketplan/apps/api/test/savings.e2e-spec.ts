import * as request from 'supertest';
import { LedgerModule } from '../src/ledger/ledger.module';
import { createTestApp, TestApp } from './support/test-app';

interface Category {
  id: string;
  name: string;
  systemKey: string | null;
}

// Roadmap Step 13: savings goals (PRD §6.8).
describe('Savings goals (e2e)', () => {
  let t: TestApp;
  let rafi: string;
  let nusrat: string;
  let savingsId: string;
  let foodId: string;
  let cashId: string;

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
  const save = (amount: number, expenseDate: string, categoryId = savingsId) =>
    as(rafi)
      .post('/expenses')
      .send({ amount, categoryId, accountId: cashId, expenseDate })
      .expect(201);

  beforeAll(async () => {
    t = await createTestApp([LedgerModule]);
    rafi = t.signUp('Rafi');
    nusrat = t.signUp('Nusrat');
    const categories = (await as(rafi).get('/categories').expect(200))
      .body as Category[];
    savingsId = categories.find((c) => c.systemKey === 'savings')!.id;
    foodId = categories.find((c) => c.name === 'Food')!.id;
    cashId = (await as(rafi).get('/accounts').expect(200)).body[0].id;
  });

  afterAll(() => t.close());

  it('requires sign-in', async () => {
    await request(t.app.getHttpServer())
      .get('/savings-goals?month=2026-10')
      .expect(401);
  });

  it('marks exactly one default category as Savings', async () => {
    const categories = (await as(rafi).get('/categories').expect(200))
      .body as Category[];
    expect(
      categories.filter((c) => c.systemKey === 'savings').map((c) => c.name),
    ).toEqual(['Savings']);
  });

  it('shows nothing saved and no target for a new account', async () => {
    const { body } = await as(rafi)
      .get('/savings-goals?month=2026-10')
      .expect(200);
    expect(body).toEqual({
      month: '2026-10',
      target: null,
      saved: 0,
      remaining: null,
      percent: null,
      status: 'none',
      category: { id: savingsId, name: 'Savings', icon: 'savings' },
    });
  });

  it('calculates the saved amount from Savings expenses in that month only', async () => {
    await save(1000.1, '2026-10-01');
    await save(0.2, '2026-10-31');
    await save(500, '2026-09-30'); // previous month
    await save(700, '2026-11-01'); // next month
    await save(250, '2026-10-15', foodId); // not savings

    const set = await as(rafi)
      .put('/savings-goals')
      .send({ month: '2026-10', targetAmount: 4000 })
      .expect(200);
    expect(set.body).toMatchObject({
      target: 4000,
      saved: 1000.3,
      remaining: 2999.7,
      percent: 25,
      status: 'saving',
    });

    // Adding, editing and deleting expenses moves the saved amount; it's never stored.
    const extra = await save(3000, '2026-10-20');
    let { body } = await as(rafi)
      .get('/savings-goals?month=2026-10')
      .expect(200);
    expect(body).toMatchObject({ saved: 4000.3, status: 'reached' });

    await as(rafi)
      .patch(`/expenses/${extra.body.id}`)
      .send({ expenseDate: '2026-11-02' })
      .expect(200);
    ({ body } = await as(rafi).get('/savings-goals?month=2026-10').expect(200));
    expect(body.saved).toBe(1000.3);

    await as(rafi).delete(`/expenses/${extra.body.id}`).expect(204);
    ({ body } = await as(rafi).get('/savings-goals?month=2026-11').expect(200));
    expect(body.saved).toBe(700);
  });

  it('keeps one target per month: setting again replaces it', async () => {
    await as(rafi)
      .put('/savings-goals')
      .send({ month: '2026-10', targetAmount: 2000 })
      .expect(200);
    const { body } = await as(rafi)
      .get('/savings-goals?month=2026-10')
      .expect(200);
    expect(body).toMatchObject({ target: 2000, percent: 50 });
    const other = await as(rafi)
      .get('/savings-goals?month=2026-09')
      .expect(200);
    expect(other.body).toMatchObject({ target: null, saved: 500 });
  });

  it('shows savings progress in the monthly summary', async () => {
    const { body } = await as(rafi)
      .get('/reports/summary?month=2026-10')
      .expect(200);
    expect(body.savings).toMatchObject({
      target: 2000,
      saved: 1000.3,
      status: 'saving',
    });
  });

  it('still counts Savings after a rename, and refuses to delete it', async () => {
    await as(rafi)
      .patch(`/categories/${savingsId}`)
      .send({ name: 'Rainy day fund' })
      .expect(200);
    // A new category called "Savings" doesn't take over.
    await as(rafi)
      .post('/categories')
      .send({ name: 'Savings', icon: 'savings' })
      .expect(201);

    const { body } = await as(rafi)
      .get('/savings-goals?month=2026-10')
      .expect(200);
    expect(body).toMatchObject({
      saved: 1000.3,
      category: { id: savingsId, name: 'Rainy day fund' },
    });

    const refused = await as(rafi)
      .delete(`/categories/${savingsId}?moveTo=${foodId}`)
      .expect(409);
    expect(refused.body.message).toBe(
      "Rainy day fund tracks your savings goal, so it can't be deleted. You can rename it.",
    );
  });

  it('removes a target', async () => {
    await as(rafi).delete('/savings-goals?month=2026-10').expect(204);
    const { body } = await as(rafi)
      .get('/savings-goals?month=2026-10')
      .expect(200);
    expect(body).toMatchObject({ target: null, saved: 1000.3 });
    await as(rafi).delete('/savings-goals?month=2026-10').expect(404);
  });

  it('validates input', async () => {
    const put = (body: object) =>
      as(rafi).put('/savings-goals').send(body).expect(400);
    await put({ month: '2026-13', targetAmount: 100 });
    await put({ month: '2026-10', targetAmount: 0 });
    await put({ month: '2026-10', targetAmount: -5 });
    await put({ month: '2026-10', targetAmount: 10.123 });
    await put({ month: '2026-10', targetAmount: 10_000_001 });
    await put({ month: '2026-10' });
    await as(rafi).get('/savings-goals').expect(400);
    await as(rafi).get('/savings-goals?month=October').expect(400);
  });

  it("keeps each user's savings private", async () => {
    await as(rafi)
      .put('/savings-goals')
      .send({ month: '2026-12', targetAmount: 900 })
      .expect(200);
    const { body } = await as(nusrat)
      .get('/savings-goals?month=2026-12')
      .expect(200);
    expect(body).toMatchObject({ target: null, saved: 0 });
    expect(body.category.id).not.toBe(savingsId);
    // Nusrat can't delete Rafi's target (she has none of her own).
    await as(nusrat).delete('/savings-goals?month=2026-12').expect(404);
    const mine = await as(rafi).get('/savings-goals?month=2026-12').expect(200);
    expect(mine.body.target).toBe(900);
  });
});
