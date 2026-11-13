export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export interface Preferences {
  theme: Theme;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  /** Missing on accounts created before preferences existed. */
  preferences?: Partial<Preferences>;
  /** Unix seconds; tokens issued before this are rejected. */
  passwordChangedAt?: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  preferences: Preferences;
}

export type UserUpdate = Partial<
  Pick<StoredUser, 'name' | 'passwordHash' | 'passwordChangedAt'>
> & { preferences?: Partial<Preferences> };

export class EmailTakenError extends Error {}

/**
 * Storage seam for accounts. The file-backed implementation keeps demos
 * working without a database; swap in a Prisma/Supabase one later.
 */
export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<StoredUser | null>;
  abstract findById(id: string): Promise<StoredUser | null>;
  /** Throws EmailTakenError if the email is already registered. */
  abstract create(
    user: Omit<StoredUser, 'id' | 'createdAt'>,
  ): Promise<StoredUser>;
  /** Merges `update` into the user (preferences merge key by key); null if not found. */
  abstract update(id: string, update: UserUpdate): Promise<StoredUser | null>;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    preferences: { theme: user.preferences?.theme ?? 'system' },
  };
}
