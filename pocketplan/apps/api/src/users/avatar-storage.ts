import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

/** Where profile photos live. Input is an already-validated data URL (avatar.ts). */
export abstract class AvatarStorage {
  /** Stores the photo and returns a URL for <img src>. */
  abstract save(userId: string, dataUrl: string): Promise<string>;
  /** Deletes a photo previously returned by save(); unknown URLs are ignored. */
  abstract remove(userId: string, url: string): Promise<void>;
}

const BUCKET = 'avatars';
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Supabase Storage, public `avatars` bucket (created by the
 * *_avatars_bucket migration). Uploads use the service role key, which only
 * the API holds. Each upload gets a new file name, so browsers never show a
 * cached old photo.
 */
@Injectable()
export class SupabaseAvatarStorage extends AvatarStorage {
  private readonly url: string;
  private readonly key: string;
  private readonly log = new Logger('AvatarStorage');

  constructor(config: ConfigService) {
    super();
    this.url = (config.get<string>('SUPABASE_URL') ?? '').replace(/\/+$/, '');
    this.key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  }

  async save(userId: string, dataUrl: string) {
    if (!this.url || !this.key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    const [, type, base64] = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)!;
    const path = `${userId}/${randomUUID()}.${EXT[type] ?? 'jpg'}`;
    const res = await fetch(`${this.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        'Content-Type': type,
        'Cache-Control': 'max-age=31536000',
      },
      body: Buffer.from(base64, 'base64'),
    });
    if (!res.ok) {
      throw new Error(
        `Photo upload failed (${res.status}): ${await res.text()}`,
      );
    }
    return `${this.url}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  async remove(userId: string, url: string) {
    const base = `${this.url}/storage/v1/object/public/${BUCKET}/`;
    // Only this user's own files (never an old data URL or someone else's photo).
    if (!url.startsWith(`${base}${userId}/`)) return;
    const path = url.slice(base.length); // "<userId>/<file>"
    const res = await fetch(`${this.url}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [path] }),
    });
    // The profile already points elsewhere; a leftover file isn't worth failing for.
    if (!res.ok)
      this.log.warn(`Couldn't delete old photo ${path} (${res.status})`);
  }
}
