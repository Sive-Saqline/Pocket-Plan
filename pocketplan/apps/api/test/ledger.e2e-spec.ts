import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { LedgerModule } from '../src/ledger/ledger.module';
import { createTestApp, TestApp } from './support/test-app';

interface Category {
  id: string;
  name: string;
}

// Throwaway accounts + ledger files; no database needed.
describe('Personal expenses (e2e)', () => {
  let app: INestApplication;
  let t: TestApp;
  let rafi: string;
  let nusrat: string;
  let categories: Category[];
  let cashId: string;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({
    get: (url: string) =>
      http().get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      http().post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      http().put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      http().patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      http().delete(url).set('Authorization', `Bearer ${token}`),
  });
  const categoryId = (name: string) =>
    categories.find((c) => c.name === name)!.id;

  beforeAll(async () => {
    t = await createTestApp([LedgerModule]);
    app = t.app;
    rafi = t.signUp('Rafi', 'rafi@example.com');
    nusrat = t.signUp('Nusrat', 'nusrat@example.com');
  });

  afterAll(async () => {
    await t.close();
  });

  it('requires sign-in', async () => {
    await http().get('/expenses').expect(401);
    await http().get('/categories').expect(401);
  });

  it('seeds the 9 PRD default categories and a Cash wallet for a new user', async () => {
    categories = (await as(rafi).get('/categories').expect(200)).body;
    expect(categories.map((c) => c.name)).toEqual([
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
    const wallets = (await as(rafi).get('/accounts').expect(200)).body;
    expect(wallets).toEqual([
      expect.objectContaining({ name: 'Cash', type: 'CASH' }),
    ]);
    cashId = wallets[0].id;
  });

  it('creates wallets and rejects duplicate names', async () => {
    await as(rafi)
      .post('/accounts')
      .send({ name: 'bKash', type: 'MOBILE_WALLET' })
      .expect(201);
    const dup = await as(rafi)
      .post('/accounts')
      .send({ name: 'BKASH', type: 'MOBILE_WALLET' })
      .expect(409);
    expect(dup.body.message).toBe('You already have a wallet called BKASH');
  });

  it('creates, lists, updates and deletes an expense', async () => {
    const created = await as(rafi)
      .post('/expenses')
      .send({
        amount: 120,
        categoryId: categoryId('Food'),
        accountId: cashId,
        expenseDate: '2026-10-27',
        description: '  Lunch at canteen ',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      amount: 120,
      description: 'Lunch at canteen',
    });

    const list = await as(rafi).get('/expenses?month=2026-10').expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await as(rafi)
      .patch(`/expenses/${created.body.id}`)
      .send({ amount: 150.5, categoryId: categoryId('Transport') })
      .expect(200);
    expect(updated.body).toMatchObject({
      amount: 150.5,
      categoryId: categoryId('Transport'),
      description: 'Lunch at canteen',
    });

    await as(rafi).delete(`/expenses/${created.body.id}`).expect(204);
    expect((await as(rafi).get('/expenses').expect(200)).body).toEqual([]);
    await as(rafi).delete(`/expenses/${created.body.id}`).expect(404);
  });

  it('validates expense input', async () => {
    const res = await as(rafi)
      .post('/expenses')
      .send({
        amount: 10.555,
        categoryId: 'nope',
        accountId: cashId,
        expenseDate: '27/10/2026',
      })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Amount must have at most 2 decimals',
        'Pick a category',
        'Date must be YYYY-MM-DD',
      ]),
    );
  });

  it("keeps each user's data private (PRD §12)", async () => {
    const mine = await as(rafi)
      .post('/expenses')
      .send({
        amount: 500,
        categoryId: categoryId('Food'),
        accountId: cashId,
        expenseDate: '2026-10-26',
      })
      .expect(201);

    // Nusrat has her own empty ledger and different category ids
    expect((await as(nusrat).get('/expenses').expect(200)).body).toEqual([]);
    const herCategories: Category[] = (
      await as(nusrat).get('/categories').expect(200)
    ).body;
    expect(herCategories.map((c) => c.id)).not.toContain(categoryId('Food'));

    // ...and can't touch Rafi's expense or use his category/wallet ids
    await as(nusrat)
      .patch(`/expenses/${mine.body.id}`)
      .send({ amount: 1 })
      .expect(404);
    await as(nusrat).delete(`/expenses/${mine.body.id}`).expect(404);
    const borrowed = await as(nusrat)
      .post('/expenses')
      .send({
        amount: 5,
        categoryId: categoryId('Food'),
        accountId: cashId,
        expenseDate: '2026-10-26',
      })
      .expect(400);
    expect(borrowed.body.message).toBe('Unknown category');

    await as(rafi).delete(`/expenses/${mine.body.id}`).expect(204);
  });

  it('summarises a month exactly, with category shares and last month for comparison', async () => {
    const add = (amount: number, category: string, expenseDate: string) =>
      as(rafi)
        .post('/expenses')
        .send({
          amount,
          categoryId: categoryId(category),
          accountId: cashId,
          expenseDate,
        })
        .expect(201);
    await add(0.1, 'Food', '2026-10-01');
    await add(0.2, 'Food', '2026-10-02');
    await add(300, 'Bills', '2026-10-31');
    await add(1000, 'Shopping', '2026-09-30');
    await add(999, 'Shopping', '2026-11-01');

    const { body } = await as(rafi)
      .get('/reports/summary?month=2026-10')
      .expect(200);
    expect(body).toMatchObject({
      month: '2026-10',
      total: 300.3, // not 300.30000000000004
      count: 3,
      previousMonth: '2026-09',
      previousTotal: 1000,
    });
    expect(body.byCategory).toEqual([
      expect.objectContaining({ name: 'Bills', total: 300, share: 99.9 }),
      expect.objectContaining({ name: 'Food', total: 0.3, share: 0.1 }),
    ]);
    expect(body.recent.map((e: { amount: number }) => e.amount)).toEqual([
      300, 0.2, 0.1,
    ]);

    const jan = await as(rafi)
      .get('/reports/summary?month=2027-01')
      .expect(200);
    expect(jan.body.previousMonth).toBe('2026-12');
    await as(rafi).get('/reports/summary?month=2026-13').expect(400);
  });
  it('sets, updates, reads and removes budgets per category per month', async () => {
    const food = categoryId('Food');
    await as(rafi)
      .put('/budgets')
      .send({ month: '2026-10', categoryId: food, plannedAmount: 300 })
      .expect(200);
    // same category + month replaces, never duplicates (PRD §8 unique constraint)
    await as(rafi)
      .put('/budgets')
      .send({ month: '2026-10', categoryId: food, plannedAmount: 375 })
      .expect(200);

    const view = (await as(rafi).get('/budgets?month=2026-10').expect(200))
      .body;
    expect(view.planned).toBe(375);
    expect(view.lines[0]).toMatchObject({
      name: 'Food',
      planned: 375,
      spent: 0.3,
      status: 'under',
    });
    expect(
      view.lines.filter((l: { planned: number | null }) => l.planned === null),
    ).toHaveLength(8);

    const summary = (
      await as(rafi).get('/reports/summary?month=2026-10').expect(200)
    ).body;
    expect(summary.budget).toMatchObject({
      planned: 375,
      spentOnBudgeted: 0.3,
    });
    expect(summary.budget.lines).toHaveLength(1);

    await as(rafi).delete(`/budgets/${food}?month=2026-10`).expect(204);
    await as(rafi).delete(`/budgets/${food}?month=2026-10`).expect(404);
  });

  it("copies last month's budgets without overwriting existing ones", async () => {
    const put = (month: string, name: string, plannedAmount: number) =>
      as(rafi)
        .put('/budgets')
        .send({ month, categoryId: categoryId(name), plannedAmount })
        .expect(200);
    await put('2026-09', 'Food', 6000);
    await put('2026-09', 'Bills', 4000);
    await put('2026-10', 'Bills', 4500);

    const res = await as(rafi)
      .post('/budgets/copy')
      .send({ from: '2026-09', to: '2026-10' })
      .expect(201);
    expect(res.body).toEqual({ copied: 1, skipped: 1 });
    const lines = (await as(rafi).get('/budgets?month=2026-10').expect(200))
      .body.lines;
    const planned = (name: string) =>
      lines.find((l: { name: string }) => l.name === name).planned;
    expect(planned('Food')).toBe(6000);
    expect(planned('Bills')).toBe(4500);
  });

  it('validates budgets and keeps them private', async () => {
    const bad = await as(rafi)
      .put('/budgets')
      .send({
        month: '2026-13',
        categoryId: categoryId('Food'),
        plannedAmount: 0,
      })
      .expect(400);
    expect(bad.body.message).toEqual(
      expect.arrayContaining([
        'month must be YYYY-MM',
        'Budget must be more than ৳0',
      ]),
    );
    const borrowed = await as(nusrat)
      .put('/budgets')
      .send({
        month: '2026-10',
        categoryId: categoryId('Food'),
        plannedAmount: 10,
      })
      .expect(400);
    expect(borrowed.body.message).toBe('Unknown category');
    // Rafi set Bills to ৳4,500 for October; Nusrat has no budgets of her own
    const herLines = (
      await as(nusrat).get('/budgets?month=2026-10').expect(200)
    ).body.lines;
    expect(
      herLines.find((l: { name: string }) => l.name === 'Bills').planned,
    ).toBeNull();
  });
});
