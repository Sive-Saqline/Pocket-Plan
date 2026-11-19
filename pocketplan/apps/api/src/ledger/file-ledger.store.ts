import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { newLedger } from './defaults';
import { LedgerStore } from './ledger.store';
import { UserLedger } from './ledger.types';
import { reportSourceFromLedger } from './reports';

const USER_ID = /^[0-9a-f-]{36}$/i;

// Demo-only persistence: one JSON file per user until the database work lands.
@Injectable()
export class FileLedgerStore extends LedgerStore {
  private readonly dir: string;
  private readonly cache = new Map<string, UserLedger>();
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(config: ConfigService) {
    super();
    this.dir = resolve(config.get('LEDGER_DIR') ?? '.data/ledger');
  }

  read(userId: string) {
    return this.enqueue(userId, () => this.load(userId));
  }

  async report(userId: string, from: string, to: string) {
    return reportSourceFromLedger(await this.read(userId), from, to);
  }

  mutate<T>(userId: string, change: (ledger: UserLedger) => T) {
    return this.enqueue(userId, async () => {
      const draft = structuredClone(await this.load(userId));
      const result = change(draft);
      await this.save(userId, draft);
      return result;
    });
  }

  private enqueue<T>(userId: string, task: () => Promise<T>): Promise<T> {
    const run = (this.queues.get(userId) ?? Promise.resolve()).then(task);
    this.queues.set(
      userId,
      run.catch(() => undefined),
    );
    return run;
  }

  private file(userId: string) {
    // ids come from our own signed tokens, but never let one become a path
    if (!USER_ID.test(userId)) throw new Error('Invalid user id');
    return join(this.dir, `${userId}.json`);
  }

  private async load(userId: string): Promise<UserLedger> {
    const cached = this.cache.get(userId);
    if (cached) return cached;
    let ledger: UserLedger;
    try {
      ledger = JSON.parse(
        await readFile(this.file(userId), 'utf8'),
      ) as UserLedger;
      // files written before budgets existed
      ledger.budgets ??= [];
      ledger.recurring ??= [];
      ledger.savings ??= [];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      ledger = newLedger();
      await this.save(userId, ledger);
    }
    this.cache.set(userId, ledger);
    return ledger;
  }

  private async save(userId: string, ledger: UserLedger) {
    await mkdir(this.dir, { recursive: true });
    const path = this.file(userId);
    await writeFile(`${path}.tmp`, JSON.stringify(ledger, null, 2));
    await rename(`${path}.tmp`, path);
    this.cache.set(userId, ledger);
  }
}
