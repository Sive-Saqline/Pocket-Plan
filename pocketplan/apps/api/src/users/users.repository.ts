export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export interface Preferences {
  theme: Theme;
}

/**
 * A PocketPlan profile (the `users` table). Accounts themselves (email,
 * password, sessions) live in Supabase Auth; the profile row is created by the
 * on_auth_user_created trigger when someone signs up.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  theme: Theme;
  avatarUrl: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  preferences: Preferences;
  /** Usable directly as an <img src>; null when the user has no photo. */
  avatarUrl: string | null;
}

/** Fields left out (undefined) stay as they are; avatarUrl null removes the photo. */
export interface ProfileUpdate {
  name?: string;
  theme?: Theme;
  avatarUrl?: string | null;
}

/** Storage seam for profiles: Prisma in the app, in-memory in tests. */
export abstract class UsersRepository {
  abstract findById(id: string): Promise<UserProfile | null>;
  /** Returns the updated profile, or null if there is no such user. */
  abstract update(
    id: string,
    update: ProfileUpdate,
  ): Promise<UserProfile | null>;
}

export function toPublicUser(user: UserProfile): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    preferences: { theme: user.theme },
    avatarUrl: user.avatarUrl,
  };
}
