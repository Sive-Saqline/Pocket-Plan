import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { LedgerModule } from '../src/ledger/ledger.module';
import { createTestApp, TestApp } from './support/test-app';

// Throwaway accounts + ledger files; no database needed.
describe('Recurring expenses (e2e)', () => {
  let app: INestApplication;
  let t: TestApp;
  let rafi: string;
  let nusrat: string;
  let bills: string;
  let health: string;
  let cash: string;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => {
    const auth = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => http().get(url).set(auth),
      post: (url: string) => http().post(url).set(auth),
      patch: (url: string) => http().patch(url).set(auth),
      delete: (url: string) => http().delete(url).set(auth),
    };
  };
  const internet = () => ({
    amount: 1200,
    categoryId: bills,
    accountId: cash,
    description: 'Internet bill',
    frequency: 'MONTHLY',
    startDate: '2026-10-25',
  });

  beforeAll(async () => {
    t = await createTestApp([LedgerModule]);
    app = t.app;
    rafi = t.signUp('rafi');
    nusrat = t.signUp('nusrat');
    const categories = (await as(rafi).get('/categories').expect(200)).body;
    const id = (name: string) =>
      categories.find((c: { name: string }) => c.name === name).id;
    bills = id('Bills');
    health = id('Health');
    cash = (await as(rafi).get('/accounts').expect(200)).body[0].id;
  });

  afterAll(async () => {
    await t.close();
  });

  it('requires sign-in', async () => {
    await http().get('/recurring-expenses').expect(401);
  });

  it('validates templates', async () => {
    const res = await as(rafi)
      .post('/recurring-expenses')
      .send({ ...internet(), description: ' ', frequency: 'HOURLY' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Name this recurring expense, e.g. Internet bill',
        'Pick how often it repeats',
      ]),
    );
  });

  it('computes "due" from the next due date and the given today (no background job)', async () => {
    const created = await as(rafi)
      .post('/recurring-expenses?today=2026-10-20')
      .send(internet())
      .expect(201);
    expect(created.body).toMatchObject({
      nextDueDate: '2026-10-25',
      isActive: true,
      due: false,
    });

    const before = await as(rafi)
      .get('/recurring-expenses?today=2026-10-24')
      .expect(200);
    expect(before.body[0]).toMatchObject({ due: false, dueCount: 0 });
    const onDay = await as(rafi)
      .get('/recurring-expenses?today=2026-10-25')
      .expect(200);
    expect(onDay.body[0]).toMatchObject({ due: true, dueCount: 1 });
  });

  it('confirms: creates the reviewed expense and advances the due date atomically', async () => {
    const [template] = (
      await as(rafi).get('/recurring-expenses?today=2026-10-28').expect(200)
    ).body;
    const res = await as(rafi)
      .post(`/recurring-expenses/${template.id}/confirm`)
      .send({ amount: 1250.5, expenseDate: '2026-10-25', today: '2026-10-28' })
      .expect(200);
    expect(res.body.expense).toMatchObject({
      amount: 1250.5, // edited during review
      categoryId: bills,
      accountId: cash,
      description: 'Internet bill',
      expenseDate: '2026-10-25',
    });
    expect(res.body.recurring).toMatchObject({
      nextDueDate: '2026-11-25',
      amount: 1200, // the template itself is unchanged
      due: false,
    });

    const expenses = (await as(rafi).get('/expenses?month=2026-10').expect(200))
      .body;
    expect(expenses).toHaveLength(1);

    // a second tap must not save the bill twice
    const again = await as(rafi)
      .post(`/recurring-expenses/${template.id}/confirm`)
      .send({ expenseDate: '2026-10-25', today: '2026-10-28' })
      .expect(409);
    expect(again.body.message).toBe('This recurring expense is not due yet');
  });

  it('counts missed occurrences and confirms them one at a time', async () => {
    const gym = await as(rafi)
      .post('/recurring-expenses')
      .send({
        ...internet(),
        description: 'Gym',
        categoryId: health,
        startDate: '2026-08-05',
      })
      .expect(201);
    const list = await as(rafi)
      .get('/recurring-expenses?today=2026-10-28')
      .expect(200);
    const g = list.body.find((r: { id: string }) => r.id === gym.body.id);
    expect(g).toMatchObject({ due: true, dueCount: 3 });
    // due ones sort first
    expect(list.body[0].id).toBe(gym.body.id);

    const confirm = () =>
      as(rafi)
        .post(`/recurring-expenses/${gym.body.id}/confirm`)
        .send({ expenseDate: '2026-10-28', today: '2026-10-28' })
        .expect(200);
    expect((await confirm()).body.recurring).toMatchObject({
      nextDueDate: '2026-09-05',
      dueCount: 2,
    });
    await confirm();
    expect((await confirm()).body.recurring).toMatchObject({
      nextDueDate: '2026-11-05',
      due: false,
    });
  });

  it('pausing stops it being due; changing frequency restarts the schedule', async () => {
    const t = await as(rafi)
      .post('/recurring-expenses')
      .send({ ...internet(), description: 'Paper', startDate: '2026-10-01' })
      .expect(201);
    const paused = await as(rafi)
      .patch(`/recurring-expenses/${t.body.id}?today=2026-10-28`)
      .send({ isActive: false })
      .expect(200);
    expect(paused.body).toMatchObject({ isActive: false, due: false });
    await as(rafi)
      .post(`/recurring-expenses/${t.body.id}/confirm`)
      .send({ expenseDate: '2026-10-28', today: '2026-10-28' })
      .expect(409);

    const weekly = await as(rafi)
      .patch(`/recurring-expenses/${t.body.id}?today=2026-10-28`)
      .send({ isActive: true, frequency: 'WEEKLY', nextDueDate: '2026-10-30' })
      .expect(200);
    expect(weekly.body).toMatchObject({
      frequency: 'WEEKLY',
      startDate: '2026-10-30',
      nextDueDate: '2026-10-30',
      due: false,
    });

    await as(rafi).delete(`/recurring-expenses/${t.body.id}`).expect(204);
    await as(rafi).delete(`/recurring-expenses/${t.body.id}`).expect(404);
  });

  it("keeps templates private and can't borrow another user's category", async () => {
    const [mine] = (await as(rafi).get('/recurring-expenses').expect(200)).body;
    expect(
      (await as(nusrat).get('/recurring-expenses').expect(200)).body,
    ).toEqual([]);
    await as(nusrat)
      .post(`/recurring-expenses/${mine.id}/confirm`)
      .send({ expenseDate: '2026-10-28', today: '2026-12-31' })
      .expect(404);
    const borrowed = await as(nusrat)
      .post('/recurring-expenses')
      .send(internet())
      .expect(400);
    expect(borrowed.body.message).toBe('Unknown category');
  });

  it('sample data adds two due templates, two upcoming and one paused', async () => {
    await as(nusrat)
      .post('/expenses/sample-data')
      .send({ today: '2026-10-28' })
      .expect(201);
    const list = (
      await as(nusrat).get('/recurring-expenses?today=2026-10-28').expect(200)
    ).body as { due: boolean; isActive: boolean; description: string }[];
    expect(list.filter((r) => r.due).map((r) => r.description)).toEqual([
      'Gym membership',
      'Mobile internet pack',
    ]);
    expect(list.filter((r) => r.isActive && !r.due)).toHaveLength(2);
    expect(list.filter((r) => !r.isActive)).toHaveLength(1);
  });
});
