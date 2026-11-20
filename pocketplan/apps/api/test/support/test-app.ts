import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TokenVerifier } from '../../src/auth/token-verifier';
import { FileLedgerStore } from '../../src/ledger/file-ledger.store';
import { LedgerStore } from '../../src/ledger/ledger.store';
import { AvatarStorage } from '../../src/users/avatar-storage';
import {
  ProfileUpdate,
  UserProfile,
  UsersRepository,
} from '../../src/users/users.repository';

/**
 * Stand-ins for Supabase so API tests run without a database or network:
 * - tokens are "test-user:<id>" (Supabase signs real ones),
 * - profiles live in memory (the database trigger creates real ones),
 * - personal data goes to temporary JSON files (FileLedgerStore creates the
 *   same 9 default categories and Cash wallet the trigger does),
 * - photos are kept as their data URL.
 */
export class FakeTokenVerifier extends TokenVerifier {
  async verify(token: string) {
    const match = /^test-user:(.+)$/.exec(token);
    if (!match) throw new Error('not a test token');
    return match[1];
  }
}

export class InMemoryUsersRepository extends UsersRepository {
  readonly users = new Map<string, UserProfile>();

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async update(id: string, { name, theme, avatarUrl }: ProfileUpdate) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated: UserProfile = {
      ...user,
      ...(name !== undefined && { name }),
      ...(theme !== undefined && { theme }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    };
    this.users.set(id, updated);
    return updated;
  }
}

export class InMemoryAvatarStorage extends AvatarStorage {
  readonly removed: string[] = [];
  async save(_userId: string, dataUrl: string) {
    return dataUrl;
  }
  async remove(_userId: string, url: string) {
    this.removed.push(url);
  }
}

export interface TestApp {
  app: INestApplication;
  users: InMemoryUsersRepository;
  avatars: InMemoryAvatarStorage;
  /** Creates a user as Supabase sign-up would, and returns their token. */
  signUp(name: string, email?: string): string;
  close(): Promise<void>;
}

/** Replaces one provider for a test, e.g. a fake AI. */
export interface ProviderOverride {
  provide: unknown;
  useValue: unknown;
}

export async function createTestApp(
  modules: Type<unknown>[],
  overrides: ProviderOverride[] = [],
): Promise<TestApp> {
  const dir = mkdtempSync(join(tmpdir(), 'pp-test-'));
  process.env.LEDGER_DIR = join(dir, 'ledger');
  const users = new InMemoryUsersRepository();
  const avatars = new InMemoryAvatarStorage();

  let builder = Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), ...modules],
  })
    .overrideProvider(TokenVerifier)
    .useClass(FakeTokenVerifier)
    .overrideProvider(UsersRepository)
    .useValue(users)
    .overrideProvider(AvatarStorage)
    .useValue(avatars)
    .overrideProvider(LedgerStore)
    .useClass(FileLedgerStore);
  for (const o of overrides) {
    builder = builder.overrideProvider(o.provide).useValue(o.useValue);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return {
    app,
    users,
    avatars,
    signUp(name, email = `${name.toLowerCase()}@example.com`) {
      const id = randomUUID();
      users.users.set(id, {
        id,
        name,
        email,
        createdAt: new Date().toISOString(),
        theme: 'system',
        avatarUrl: null,
      });
      return `test-user:${id}`;
    },
    async close() {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
      delete process.env.LEDGER_DIR;
    },
  };
}
