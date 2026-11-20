import { NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import { AiModule } from '../src/ai/ai.module';
import { AiError, AiProvider, type AiRequest } from '../src/ai/ai.provider';
import { GroupsService } from '../src/groups/groups.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { createTestApp, TestApp } from './support/test-app';

/** Answers with whatever the test sets; remembers every question. */
class FakeAi extends AiProvider {
  answer: (req: AiRequest) => Promise<unknown> = async () => ({});
  readonly asked: AiRequest[] = [];
  generateJson(req: AiRequest) {
    this.asked.push(req);
    return this.answer(req);
  }
}

const GROUP_ID = '0b9d8a52-6f1e-4c55-9a39-2f6e1d1c8a10';

// Roadmap Step 18 (PRD §6.14-6.15, §11). Groups live in the database, which
// these tests run without, so a stand-in GroupsService knows one group.
describe('AI suggestions (e2e)', () => {
  let t: TestApp;
  const ai = new FakeAi();
  let rafi: string;
  let rafiId: string;
  let transport: string;
  let bkash: string;

  const groups = {
    names: async () => [{ id: GROUP_ID, name: 'Flatmates' }],
    get: async (userId: string, groupId: string) => {
      if (groupId !== GROUP_ID || userId !== rafiId) {
        throw new NotFoundException('Group not found');
      }
      return {
        id: GROUP_ID,
        name: 'Flatmates',
        members: [
          { userId: rafiId, name: 'Rafi', active: true },
          { userId: 'nusrat-id', name: 'Nusrat', active: true },
          { userId: 'tanim-id', name: 'Tanim', active: false },
        ],
      };
    },
  };

  const as = (token: string) => {
    const http = () => request(t.app.getHttpServer());
    const auth = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => http().get(url).set(auth),
      post: (url: string) => http().post(url).set(auth),
    };
  };

  beforeAll(async () => {
    t = await createTestApp(
      [PrismaModule, AiModule],
      [
        { provide: AiProvider, useValue: ai },
        { provide: GroupsService, useValue: groups },
      ],
    );
    rafi = t.signUp('Rafi');
    rafiId = rafi.slice('test-user:'.length);
    const categories = (await as(rafi).get('/categories').expect(200)).body as {
      id: string;
      name: string;
    }[];
    transport = categories.find((c) => c.name === 'Transport')!.id;
    bkash = (
      await as(rafi)
        .post('/accounts')
        .send({ name: 'bKash', type: 'MOBILE_WALLET' })
        .expect(201)
    ).body.id;
  });

  afterAll(() => t.close());

  beforeEach(() => {
    ai.answer = async () => ({});
    ai.asked.length = 0;
  });

  it('needs sign-in', async () => {
    await request(t.app.getHttpServer())
      .post('/ai/parse-expense')
      .send({ text: 'Rickshaw 120' })
      .expect(401);
  });

  it('refuses empty and over-long text without asking the AI', async () => {
    await as(rafi).post('/ai/parse-expense').send({ text: '   ' }).expect(400);
    await as(rafi)
      .post('/ai/parse-expense')
      .send({ text: 'x'.repeat(301) })
      .expect(400);
    expect(ai.asked).toHaveLength(0);
  });

  it('fills a personal expense from a sentence, and saves nothing', async () => {
    ai.answer = async () => ({
      amount: 120,
      description: 'Rickshaw',
      categoryId: transport,
      accountId: bkash,
      expenseDate: '2026-11-19',
      groupId: null,
    });
    const res = await as(rafi)
      .post('/ai/parse-expense')
      .send({ text: 'Rickshaw 120 by bkash yesterday', today: '2026-11-20' })
      .expect(200);

    expect(res.body).toEqual({
      scope: 'personal',
      amount: 120,
      description: 'Rickshaw',
      categoryId: transport,
      accountId: bkash,
      expenseDate: '2026-11-19',
      group: null,
    });
    // the model saw my categories, wallets and groups, plus the sentence
    const asked = ai.asked[0];
    expect(asked.prompt).toContain('"name":"Transport"');
    expect(asked.prompt).toContain('"name":"bKash"');
    expect(asked.prompt).toContain('"name":"Flatmates"');
    expect(asked.prompt).toContain('Rickshaw 120 by bkash yesterday');
    expect(asked.system).toContain('Today is 2026-11-20');

    // PRD §11: a suggestion is never saved
    expect((await as(rafi).get('/expenses').expect(200)).body).toEqual([]);
  });

  it("drops anything that isn't one of mine or doesn't fit the form", async () => {
    ai.answer = async () => ({
      amount: -40,
      description: 'Lunch',
      categoryId: 'someone-elses-category',
      accountId: 'made-up',
      expenseDate: '2030-01-01',
      groupId: 'not-my-group',
    });
    const res = await as(rafi)
      .post('/ai/parse-expense')
      .send({ text: 'Lunch', today: '2026-11-20' })
      .expect(200);
    expect(res.body).toMatchObject({
      amount: null,
      description: 'Lunch',
      categoryId: null,
      accountId: null,
      expenseDate: null,
      group: null,
    });
  });

  it('points to the group when the sentence is about one', async () => {
    ai.answer = async () => ({ amount: 900, groupId: GROUP_ID });
    const res = await as(rafi)
      .post('/ai/parse-expense')
      .send({ text: 'Groceries 900 for flatmates' })
      .expect(200);
    expect(res.body.group).toEqual({ id: GROUP_ID, name: 'Flatmates' });
  });

  it('fills a shared expense with active members only', async () => {
    ai.answer = async () => ({
      amount: 900,
      description: 'Groceries',
      category: 'groceries',
      expenseDate: null,
      paidBy: 'nusrat-id',
      splitType: 'EQUAL',
      participants: [
        { userId: rafiId, value: null },
        { userId: 'nusrat-id', value: null },
        { userId: 'tanim-id', value: null }, // has left
      ],
    });
    const res = await as(rafi)
      .post('/ai/parse-expense')
      .send({ text: 'Nusrat paid 900 for groceries', groupId: GROUP_ID })
      .expect(200);
    expect(res.body).toMatchObject({
      scope: 'group',
      amount: 900,
      category: 'groceries',
      paidBy: 'nusrat-id',
      splitType: 'EQUAL',
      participants: [
        { userId: rafiId, value: null },
        { userId: 'nusrat-id', value: null },
      ],
    });
    expect(ai.asked[0].prompt).not.toContain('Tanim');
  });

  it("refuses a group I'm not in without asking the AI", async () => {
    await as(rafi)
      .post('/ai/parse-expense')
      .send({ text: 'Tea 20', groupId: '7c1f3a2e-0d4b-4e8a-9b6c-5a4d3e2f1b0c' })
      .expect(404);
    expect(ai.asked).toHaveLength(0);
  });

  it('suggests a category for a description', async () => {
    ai.answer = async () => ({ categoryId: transport });
    expect(
      (
        await as(rafi)
          .post('/ai/categorize')
          .send({ description: 'Uber to office' })
          .expect(200)
      ).body,
    ).toEqual({ categoryId: transport, name: 'Transport' });

    ai.answer = async () => ({ categoryId: 'unknown' });
    expect(
      (
        await as(rafi)
          .post('/ai/categorize')
          .send({ description: 'Something odd' })
          .expect(200)
      ).body,
    ).toEqual({ categoryId: null, name: null });

    ai.answer = async () => ({ category: 'fuel' });
    expect(
      (
        await as(rafi)
          .post('/ai/categorize')
          .send({ description: 'Octane', groupId: GROUP_ID })
          .expect(200)
      ).body,
    ).toEqual({ category: 'fuel' });
  });

  it('reports AI problems with messages the form can show', async () => {
    const cases: [AiError['reason'], number, RegExp][] = [
      ['not_configured', 503, /aren't set up/],
      ['timeout', 503, /took too long/],
      ['busy', 503, /busy/],
      ['failed', 502, /couldn't read that/],
    ];
    for (const [reason, status, message] of cases) {
      ai.answer = async () => {
        throw new AiError(reason);
      };
      const res = await as(rafi)
        .post('/ai/parse-expense')
        .send({ text: 'Tea 20' })
        .expect(status);
      expect(res.body.message).toMatch(message);
    }
    // manual entry still works while the AI is down
    await as(rafi)
      .post('/expenses')
      .send({
        amount: 20,
        categoryId: transport,
        accountId: bkash,
        expenseDate: '2026-11-20',
      })
      .expect(201);
  });

  describe('Reports (Step 20)', () => {
    let mina: string;
    let food: string;
    let cash: string;
    const view = {
      start: '2026-09-01',
      end: '2026-11-30',
      today: '2026-11-20',
    };
    const narration = {
      answer: 'অক্টোবরে খাবারে ৳250',
      summary: 'You spent ৳350.',
      notable: '',
      forecast: 'If the pattern holds, about ৳175.',
    };

    beforeAll(async () => {
      mina = t.signUp('Mina');
      const categories = (await as(mina).get('/categories').expect(200))
        .body as { id: string; name: string }[];
      food = categories.find((c) => c.name === 'Food')!.id;
      cash = (await as(mina).get('/accounts').expect(200)).body[0].id;
      for (const [amount, expenseDate] of [
        [100, '2026-09-10'],
        [250, '2026-10-05'],
        [40, '2026-08-01'], // previous period
      ] as const) {
        await as(mina)
          .post('/expenses')
          .send({ amount, categoryId: food, accountId: cash, expenseDate })
          .expect(201);
      }
    });

    /** First call: filters; second: the narration. */
    const answerReportAsk = (filters: unknown) => {
      ai.answer = async (req) =>
        req.system.includes('set the filters') ? filters : narration;
    };

    it('turns a question into a filtered report and an answer', async () => {
      answerReportAsk({
        start: '2026-10-01',
        end: '2026-10-31',
        groupId: null,
        categoryIds: [food, 'not-mine'],
        walletIds: [],
        groupCategories: [],
      });
      const res = await as(mina)
        .post('/ai/report-ask')
        .send({ ...view, question: 'অক্টোবরে খাবারে কত খরচ?' })
        .expect(200);

      expect(res.body).toEqual({
        view: {
          start: '2026-10-01',
          end: '2026-10-31',
          groupId: null,
          categories: [food],
          wallets: [],
        },
        answer: narration.answer,
        insights: {
          summary: narration.summary,
          notable: '',
          forecast: narration.forecast,
        },
      });

      // The narration got the database's numbers, in the question's language
      const [, narrate] = ai.asked;
      expect(narrate.system).toContain('same language and script as QUESTION');
      const facts = JSON.parse(narrate.prompt.split('\n')[0].slice(8));
      expect(facts.total).toBe(250);
      expect(facts.previousPeriod).toMatchObject({
        from: 'September 2026',
        total: 100,
        changePercent: 150,
      });
      expect(facts.filteredTo).toEqual({ categories: ['Food'], wallets: [] });
    });

    it('writes insights for the report on screen, and changes nothing', async () => {
      const before = (await as(mina).get('/expenses?month=2026-10').expect(200))
        .body;
      ai.answer = async () => narration;
      const res = await as(mina).post('/ai/insights').send(view).expect(200);
      expect(res.body).toEqual({
        summary: narration.summary,
        notable: '',
        forecast: narration.forecast,
      });
      expect(ai.asked).toHaveLength(1);
      expect(ai.asked[0].system).toContain('Write in English');
      const facts = JSON.parse(ai.asked[0].prompt.slice(8));
      expect(facts.total).toBe(350);
      expect(facts.forecastBaseline).toBe(175); // Sep and Oct; Nov isn't over
      expect(
        (await as(mina).get('/expenses?month=2026-10').expect(200)).body,
      ).toEqual(before);
    });

    it('refuses a bad range before asking the AI', async () => {
      await as(mina)
        .post('/ai/insights')
        .send({ ...view, start: '2025-01-01' })
        .expect(400);
      await as(mina)
        .post('/ai/report-ask')
        .send({ ...view, question: '   ' })
        .expect(400);
      expect(ai.asked).toHaveLength(0);
    });

    it('passes AI failures on as messages', async () => {
      ai.answer = async () => {
        throw new AiError('busy');
      };
      const res = await as(mina).post('/ai/insights').send(view).expect(503);
      expect(res.body.message).toMatch(/busy/);
    });
  });

  it('limits each user to 20 AI calls a minute', async () => {
    const busy = t.signUp('Busy');
    for (let i = 0; i < 20; i++) {
      await as(busy)
        .post('/ai/categorize')
        .send({ description: 'Tea' })
        .expect(200);
    }
    await as(busy)
      .post('/ai/categorize')
      .send({ description: 'Tea' })
      .expect(429);
    // other people aren't affected
    await as(rafi)
      .post('/ai/categorize')
      .send({ description: 'Tea' })
      .expect(200);
  });
});
