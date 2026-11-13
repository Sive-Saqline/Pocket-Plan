import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { BalancesModule } from '../src/balances/balances.module';
import * as demo from '../demo/mess-month.json';

// No database needed: the preview endpoint is pure computation.
describe('POST /balances/preview (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BalancesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('settles the demo shared-flat month', async () => {
    const res = await request(app.getHttpServer())
      .post('/balances/preview')
      .send(demo)
      .expect(200);

    expect(res.body.balances).toEqual([
      { memberId: 'rafi', name: 'Rafi', balance: 15576.53 },
      { memberId: 'nila', name: 'Nila', balance: -2972.96 },
      { memberId: 'tanvir', name: 'Tanvir', balance: -7663.45 },
      { memberId: 'sumaiya', name: 'Sumaiya', balance: -4940.12 },
    ]);
    expect(res.body.payments).toEqual([
      {
        from: 'tanvir',
        fromName: 'Tanvir',
        to: 'rafi',
        toName: 'Rafi',
        amount: 7663.45,
      },
      {
        from: 'sumaiya',
        fromName: 'Sumaiya',
        to: 'rafi',
        toName: 'Rafi',
        amount: 4940.12,
      },
      {
        from: 'nila',
        fromName: 'Nila',
        to: 'rafi',
        toName: 'Rafi',
        amount: 2972.96,
      },
    ]);
  });

  it('rejects amounts with more than two decimals', () => {
    return request(app.getHttpServer())
      .post('/balances/preview')
      .send({
        members: [{ id: 'a', name: 'A' }],
        expenses: [{ amount: 10.555, paidBy: 'a' }],
      })
      .expect(400);
  });

  it('rejects a payer who is not a member', async () => {
    const res = await request(app.getHttpServer())
      .post('/balances/preview')
      .send({
        members: [{ id: 'a', name: 'A' }],
        expenses: [{ amount: 10, paidBy: 'ghost' }],
      })
      .expect(400);
    expect(res.body.message).toBe('ghost is not a member of this group');
  });
});
