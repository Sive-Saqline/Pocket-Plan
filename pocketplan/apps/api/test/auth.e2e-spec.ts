import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';

// Runs against a throwaway accounts file; no database needed.
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dir: string;
  const rafi = {
    name: 'Rafi',
    email: 'Rafi@Example.com ',
    password: 'kacchi-bhai-42',
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'pp-auth-'));
    process.env.USERS_FILE = join(dir, 'users.json');
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    }).compile();
    app = moduleRef.createNestApplication();
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
    rmSync(dir, { recursive: true, force: true });
    delete process.env.USERS_FILE;
  });

  const http = () => request(app.getHttpServer());

  it('registers a user and returns a token without the password hash', async () => {
    const res = await http().post('/auth/register').send(rafi).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: 'Rafi',
      email: 'rafi@example.com',
      createdAt: expect.any(String),
      preferences: { theme: 'system' },
      avatarUrl: null,
    });
  });

  it('stores a bcrypt hash, never the plain password', () => {
    const stored = readFileSync(process.env.USERS_FILE!, 'utf8');
    expect(stored).not.toContain(rafi.password);
    expect(stored).toMatch(/"passwordHash": "\$2[aby]\$10\$/);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ ...rafi, email: 'RAFI@example.com' })
      .expect(409);
    expect(res.body.message).toBe('An account with this email already exists');
  });

  it('validates registration input', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ name: ' ', email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Name is required',
        'Enter a valid email address',
        'Password must be at least 8 characters',
      ]),
    );
  });

  it('logs in with the right password and reads /auth/me', async () => {
    const login = await http()
      .post('/auth/login')
      .send({ email: 'rafi@example.com', password: rafi.password })
      .expect(200);
    const me = await http()
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ name: 'Rafi', email: 'rafi@example.com' });
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrong = await http()
      .post('/auth/login')
      .send({ email: 'rafi@example.com', password: 'wrong-password' })
      .expect(401);
    const unknown = await http()
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-123' })
      .expect(401);
    expect(wrong.body.message).toBe('Incorrect email or password');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('protects /auth/me', async () => {
    await http().get('/auth/me').expect(401);
    await http()
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });
  describe('profile', () => {
    let token: string;
    const authed = (t: string) => ({ Authorization: `Bearer ${t}` });

    beforeAll(async () => {
      token = (
        await http()
          .post('/auth/login')
          .send({ email: 'rafi@example.com', password: rafi.password })
          .expect(200)
      ).body.accessToken;
    });

    it('defaults the theme to system', async () => {
      const me = await http().get('/auth/me').set(authed(token)).expect(200);
      expect(me.body.preferences).toEqual({ theme: 'system' });
    });

    it('updates name and theme', async () => {
      const res = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ name: '  Rafi Hasan ', preferences: { theme: 'dark' } })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'Rafi Hasan',
        email: 'rafi@example.com',
        preferences: { theme: 'dark' },
      });
      // name-only update keeps the theme
      const again = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ name: 'Rafi' })
        .expect(200);
      expect(again.body.preferences.theme).toBe('dark');
      // ...and a theme-only update keeps the name (regression: it used to erase it)
      const themeOnly = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ preferences: { theme: 'light' } })
        .expect(200);
      expect(themeOnly.body).toMatchObject({
        name: 'Rafi',
        preferences: { theme: 'light' },
      });
      const empty = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ preferences: {} })
        .expect(200);
      expect(empty.body).toMatchObject({
        name: 'Rafi',
        preferences: { theme: 'light' },
      });
    });

    it('rejects bad profile input, and email cannot be changed', async () => {
      const res = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ name: ' ', preferences: { theme: 'neon' } })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'Name is required',
          'preferences.Theme must be system, light or dark',
        ]),
      );
      await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ email: 'new@example.com' })
        .expect(400);
    });

    it('sets, replaces and removes a profile photo', async () => {
      const jpeg = `data:image/jpeg;base64,${Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(64),
      ]).toString('base64')}`;
      const set = await http()
        .put('/auth/me/avatar')
        .set(authed(token))
        .send({ image: jpeg })
        .expect(200);
      expect(set.body).toMatchObject({ name: 'Rafi', avatarUrl: jpeg });
      // it comes back on /auth/me, and other profile edits keep it
      await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ name: 'Rafi' })
        .expect(200);
      const me = await http().get('/auth/me').set(authed(token)).expect(200);
      expect(me.body.avatarUrl).toBe(jpeg);

      const removed = await http()
        .delete('/auth/me/avatar')
        .set(authed(token))
        .expect(200);
      expect(removed.body.avatarUrl).toBeNull();
    });

    it('rejects photos that are not real JPG/PNG/WebP images', async () => {
      const fakePng = `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
      const res = await http()
        .put('/auth/me/avatar')
        .set(authed(token))
        .send({ image: fakePng })
        .expect(400);
      expect(res.body.message).toBe("That file isn't a valid image.");
      await http()
        .put('/auth/me/avatar')
        .set(authed(token))
        .send({ image: 'https://example.com/me.jpg' })
        .expect(400);
      await http()
        .put('/auth/me/avatar')
        .set(authed(token))
        .send({})
        .expect(400);
      // requires sign-in
      await http().put('/auth/me/avatar').send({ image: fakePng }).expect(401);
      await http().delete('/auth/me/avatar').expect(401);
    });

    it('checks the current password and rejects reusing it', async () => {
      const wrong = await http()
        .post('/auth/change-password')
        .set(authed(token))
        .send({ currentPassword: 'nope-nope', newPassword: 'brand-new-pass' })
        .expect(400);
      expect(wrong.body.message).toBe('Current password is incorrect');
      const same = await http()
        .post('/auth/change-password')
        .set(authed(token))
        .send({ currentPassword: rafi.password, newPassword: rafi.password })
        .expect(400);
      expect(same.body.message).toBe(
        'New password must be different from the current one',
      );
    });

    it('changes the password, keeps this session and ends older ones', async () => {
      // a token issued in an earlier second, as an older session would have
      await new Promise((r) => setTimeout(r, 1100));
      const res = await http()
        .post('/auth/change-password')
        .set(authed(token))
        .send({ currentPassword: rafi.password, newPassword: 'brand-new-pass' })
        .expect(200);

      await http()
        .get('/auth/me')
        .set(authed(res.body.accessToken))
        .expect(200);
      await http().get('/auth/me').set(authed(token)).expect(401);

      await http()
        .post('/auth/login')
        .send({ email: 'rafi@example.com', password: rafi.password })
        .expect(401);
      await http()
        .post('/auth/login')
        .send({ email: 'rafi@example.com', password: 'brand-new-pass' })
        .expect(200);
    });
  });
});
