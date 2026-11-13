import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  EmailTakenError,
  StoredUser,
  UsersRepository,
  UserUpdate,
} from './users.repository';

// Demo-only persistence until the database work lands.
@Injectable()
export class FileUsersRepository extends UsersRepository {
  private readonly path: string;
  private users: StoredUser[] | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(config: ConfigService) {
    super();
    this.path = resolve(config.get('USERS_FILE') ?? '.data/users.json');
  }

  async findByEmail(email: string) {
    return (await this.load()).find((u) => u.email === email) ?? null;
  }

  async findById(id: string) {
    return (await this.load()).find((u) => u.id === id) ?? null;
  }

  create(input: Omit<StoredUser, 'id' | 'createdAt'>) {
    // Serialise writes so two concurrent sign-ups can't both claim an email.
    const run = this.queue.then(async () => {
      const users = await this.load();
      if (users.some((u) => u.email === input.email)) {
        throw new EmailTakenError();
      }
      const user: StoredUser = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      await this.save([...users, user]);
      return user;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  update(id: string, { preferences, ...fields }: UserUpdate) {
    const run = this.queue.then(async () => {
      const users = await this.load();
      const current = users.find((u) => u.id === id);
      if (!current) return null;
      // Fields left out (undefined) mean "unchanged", never "erase".
      const defined = <T extends object>(value: T) =>
        Object.fromEntries(
          Object.entries(value).filter(([, v]) => v !== undefined),
        ) as Partial<T>;
      const updated: StoredUser = {
        ...current,
        ...defined(fields),
        ...(preferences && {
          preferences: { ...current.preferences, ...defined(preferences) },
        }),
      };
      await this.save(users.map((u) => (u.id === id ? updated : u)));
      return updated;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async load(): Promise<StoredUser[]> {
    if (this.users) return this.users;
    try {
      this.users = JSON.parse(
        await readFile(this.path, 'utf8'),
      ) as StoredUser[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      this.users = [];
    }
    return this.users;
  }

  private async save(users: StoredUser[]) {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, JSON.stringify(users, null, 2));
    await rename(tmp, this.path);
    this.users = users;
  }
}
