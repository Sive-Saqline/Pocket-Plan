import * as request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ReportsModule } from '../src/reports/reports.module';
import { createTestApp, TestApp } from './support/test-app';

interface Category {
  id: string;
  name: string;
  systemKey: string | null;
}
interface Expense {
  amount: number;
  categoryId: string;
  accountId: string;
}

// Roadmap Step 14: reports (PRD §6.9). Personal reports only: group reports
// need the database (Prisma), which these tests run without.
describe('Reports (e2e)', () => {
  let t: TestApp;
  let rafi: string;
  let nusrat: string;
  let food: string;
  let transport: string;
  let savings: string;
  let cash: string;
  let bkash: string;

  const as = (token: string) => {
    const http = () => request(t.app.getHttpServer());
    const auth = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => http().get(url).set(auth),
      post: (url: string) => http().post(url).set(auth),
      put: (url: string) => http().put(url).set(auth),
    };
  };
  const spend = (
    amount: number,
    expenseDate: string,
    categoryId = food,
    accountId = cash,
  ) =>
    as(rafi)
      .post('/expenses')
      .send({ amount, categoryId, accountId, expenseDate })
      .expect(201);

  beforeAll(async () => {
    t = await createTestApp([PrismaModule, ReportsModule]);
    rafi = t.signUp('Rafi');
    nusrat = t.signUp('Nusrat');
    const categories = (await as(rafi).get('/categories').expect(200))
      .body as Category[];
    food = categories.find((c) => c.name === 'Food')!.id;
    transport = categories.find((c) => c.name === 'Transport')!.id;
    savings = categories.find((c) => c.systemKey === 'savings')!.id;
    cash = (await as(rafi).get('/accounts').expect(200)).body[0].id;
    bkash = (
      await as(rafi)
        .post('/accounts')
        .send({ name: 'bKash', type: 'MOBILE_WALLET' })
        .expect(201)
    ).body.id;

    await spend(0.1, '2026-08-31'); // just outside the range below
    await spend(0.1, '2026-09-01');
    await spend(0.2, '2026-09-30', food, bkash);
    await spend(120.5, '2026-10-15', transport);
    await spend(300, '2026-10-20', savings, bkash);
    await spend(1000, '2026-12-01'); // just outside
    await as(rafi)
      .put('/budgets')
      .send({ month: '2026-09', categoryId: food, plannedAmount: 0.25 })
      .expect(200);
    await as(rafi)
      .put('/savings-goals')
      .send({ month: '2026-10', targetAmount: 500 })
      .expect(200);
  });

  afterAll(() => t.close());

  const report = (from = '2026-09', to = '2026-11', token = rafi) =>
    as(token).get(`/reports?from=${from}&to=${to}`);

  it('requires sign-in', async () => {
    await request(t.app.getHttpServer())
      .get('/reports?from=2026-09&to=2026-11')
      .expect(401);
  });

  it('rejects bad or too-long ranges', async () => {
    await report('2026-13', '2026-11').expect(400);
    await report('2026-11', '2026-09').expect(400);
    await report('2025-11', '2026-11').expect(400); // 13 months
    await report('2025-12', '2026-11').expect(200); // 12 months
    await as(rafi)
      .get('/reports?from=2026-09&to=2026-11&group_id=nope')
      .expect(400);
  });

  it('matches the expense list for the same months, to the paisa', async () => {
    const { body } = await report().expect(200);
    const listed: Expense[] = [];
    for (const month of ['2026-09', '2026-10', '2026-11']) {
      listed.push(
        ...(await as(rafi).get(`/expenses?month=${month}`).expect(200)).body,
      );
    }
    const cents = (xs: { amount?: number; total?: number }[]) =>
      xs.reduce((t, x) => t + Math.round((x.amount ?? x.total!) * 100), 0);

    expect(body.count).toBe(listed.length);
    expect(Math.round(body.total * 100)).toBe(cents(listed));
    expect(Math.round(body.total * 100)).toBe(cents(body.trend));
    expect(Math.round(body.total * 100)).toBe(cents(body.byCategory));
    expect(Math.round(body.total * 100)).toBe(cents(body.byWallet));
    expect(body.total).toBe(420.8);
  });

  it('breaks spending down by category, wallet and month', async () => {
    const { body } = await report().expect(200);
    expect(body.months).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(body.byCategory.map((c: { name: string }) => c.name)).toEqual([
      'Savings',
      'Transport',
      'Food',
    ]);
    expect(body.byCategory[2]).toMatchObject({ id: food, total: 0.3 });
    expect(
      body.byWallet.map((w: { name: string; total: number }) => [
        w.name,
        w.total,
      ]),
    ).toEqual([
      ['bKash', 300.2],
      ['Cash', 120.6],
    ]);
    expect(body.trendBy).toBe('month');
    expect(body.trend).toEqual([
      { key: '2026-09', total: 0.3, count: 2 },
      { key: '2026-10', total: 420.5, count: 2 },
      { key: '2026-11', total: 0, count: 0 },
    ]);
  });

  it('compares budgets only with the months they were set for', async () => {
    const { body } = await report().expect(200);
    expect(body.budget).toMatchObject({
      planned: 0.25,
      spent: 0.3,
      percent: 120,
      status: 'over',
    });
    expect(body.budget.lines).toEqual([
      expect.objectContaining({
        categoryId: food,
        planned: 0.25,
        spent: 0.3,
        remaining: -0.05,
        status: 'over',
      }),
    ]);
  });

  it('shows savings progress against the targets in range', async () => {
    const { body } = await report().expect(200);
    expect(body.savings).toMatchObject({
      target: 500,
      saved: 300,
      percent: 60,
      status: 'saving',
    });
    expect(body.savings.months).toEqual([
      { month: '2026-09', target: null, saved: 0 },
      { month: '2026-10', target: 500, saved: 300 },
      { month: '2026-11', target: null, saved: 0 },
    ]);
  });

  it('compares with the previous range of the same length', async () => {
    const { body } = await report().expect(200);
    expect(body.previous).toMatchObject({
      start: '2026-06-01',
      end: '2026-08-31',
      total: 0.1, // 31 August
    });
  });

  it('covers any days (start, end): by day, compared with the days before', async () => {
    const { body } = await as(rafi)
      .get('/reports?start=2026-09-30&end=2026-10-15')
      .expect(200);
    expect(body).toMatchObject({
      start: '2026-09-30',
      end: '2026-10-15',
      days: 16,
      wholeMonths: false,
      fullMonths: [],
      total: 120.7, // 30 Sep + 15 Oct
      count: 2,
      trendBy: 'day',
      previous: { start: '2026-09-14', end: '2026-09-29', total: 0 },
    });
    expect(body.trend).toHaveLength(16);
    expect(body.trend[0]).toEqual({ key: '2026-09-30', total: 0.2, count: 1 });
    // budgets and savings are monthly: no month is fully covered here
    expect(body.budget.status).toBe('none');
    expect(body.savings.target).toBeNull();
  });

  it('rejects bad day ranges', async () => {
    const days = (q: string) => as(rafi).get(`/reports?${q}`);
    await days('start=2026-10-15&end=2026-10-01').expect(400);
    await days('start=2025-01-01&end=2026-01-02').expect(400); // over a year
    await days('start=2026-02-30&end=2026-03-05').expect(400);
    await days('start=2026-10-01').expect(400); // no end
    await days('').expect(400);
  });

  it('narrows to categories and wallets (Step 20), comparison included', async () => {
    const filtered = (query: string) =>
      as(rafi).get(`/reports?from=2026-09&to=2026-11&${query}`).expect(200);

    const food_ = (await filtered(`categories=${food}`)).body;
    expect(food_.total).toBe(0.3);
    expect(food_.filters).toEqual({ categories: [food], wallets: [] });
    expect(food_.byCategory.map((c: { id: string }) => c.id)).toEqual([food]);
    expect(food_.previous.total).toBe(0.1);

    const onBkash = (await filtered(`wallets=${bkash}`)).body;
    expect(onBkash.total).toBe(300.2);
    expect(onBkash.previous.total).toBe(0);

    const both = (
      await filtered(`categories=${food},${transport}&wallets=${bkash}`)
    ).body;
    expect(both.total).toBe(0.2);

    // a category that isn't mine is ignored, not an error
    const other = (await filtered('categories=not-mine')).body;
    expect(other.filters.categories).toEqual([]);
    expect(other.total).toBe(420.8);
  });

  it("never shows another user's spending", async () => {
    const { body } = await report('2026-09', '2026-11', nusrat).expect(200);
    expect(body).toMatchObject({ total: 0, count: 0, byCategory: [] });
    expect(body.budget.status).toBe('none');
    expect(body.savings.status).toBe('none');
  });
});
