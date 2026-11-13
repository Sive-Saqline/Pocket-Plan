import * as request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { createTestApp, TestApp } from './support/test-app';

// Sign-up, sign-in and passwords are Supabase Auth's job (web app). These
// tests cover what the API owns: checking tokens and the user's profile.
describe('Auth & profile (e2e)', () => {
  let t: TestApp;
  let token: string;
  const http = () => request(t.app.getHttpServer());
  const authed = (tk: string) => ({ Authorization: `Bearer ${tk}` });

  beforeAll(async () => {
    t = await createTestApp([AuthModule]);
    token = t.signUp('Rafi', 'rafi@example.com');
  });

  afterAll(() => t.close());

  describe('sign-in checks', () => {
    it('rejects requests without a token', async () => {
      const res = await http().get('/auth/me').expect(401);
      expect(res.body.message).toBe('Sign in to continue');
    });

    it('rejects invalid tokens', async () => {
      await http().get('/auth/me').set(authed('not-a-real-token')).expect(401);
      await http().get('/auth/me').set({ Authorization: token }).expect(401); // no "Bearer"
    });

    it('rejects a valid token whose account was deleted', async () => {
      const gone = t.signUp('Gone');
      t.users.users.delete(gone.slice('test-user:'.length));
      const res = await http().get('/auth/me').set(authed(gone)).expect(401);
      expect(res.body.message).toBe('Your session has expired');
    });
  });

  describe('profile', () => {
    it('returns the signed-in profile without anything sensitive', async () => {
      const me = await http().get('/auth/me').set(authed(token)).expect(200);
      expect(me.body).toEqual({
        id: expect.any(String),
        name: 'Rafi',
        email: 'rafi@example.com',
        createdAt: expect.any(String),
        preferences: { theme: 'system' },
        avatarUrl: null,
      });
    });

    it('updates name and theme independently', async () => {
      const res = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ name: '  Rafi Hasan ', preferences: { theme: 'dark' } })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'Rafi Hasan',
        preferences: { theme: 'dark' },
      });
      const nameOnly = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ name: 'Rafi' })
        .expect(200);
      expect(nameOnly.body.preferences.theme).toBe('dark');
      // a theme-only update keeps the name (regression: it used to erase it)
      const themeOnly = await http()
        .patch('/auth/me')
        .set(authed(token))
        .send({ preferences: { theme: 'light' } })
        .expect(200);
      expect(themeOnly.body).toMatchObject({
        name: 'Rafi',
        preferences: { theme: 'light' },
      });
    });

    it('rejects bad profile input, and email cannot be changed here', async () => {
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

    it('no longer offers its own register, login or password routes', async () => {
      await http().post('/auth/register').send({}).expect(404);
      await http().post('/auth/login').send({}).expect(404);
      await http()
        .post('/auth/change-password')
        .set(authed(token))
        .send({})
        .expect(404);
    });
  });

  describe('profile photo', () => {
    const jpeg = `data:image/jpeg;base64,${Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(64),
    ]).toString('base64')}`;

    it('sets, replaces and removes a photo, deleting the old file each time', async () => {
      const set = await http()
        .put('/auth/me/avatar')
        .set(authed(token))
        .send({ image: jpeg })
        .expect(200);
      expect(set.body).toMatchObject({ name: 'Rafi', avatarUrl: jpeg });
      const me = await http().get('/auth/me').set(authed(token)).expect(200);
      expect(me.body.avatarUrl).toBe(jpeg);

      const removed = await http()
        .delete('/auth/me/avatar')
        .set(authed(token))
        .expect(200);
      expect(removed.body.avatarUrl).toBeNull();
      expect(t.avatars.removed).toContain(jpeg);
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
      await http().put('/auth/me/avatar').send({ image: jpeg }).expect(401);
      await http().delete('/auth/me/avatar').expect(401);
    });
  });
});
