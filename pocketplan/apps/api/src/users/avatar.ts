/**
 * Profile photo validation. The web app crops and shrinks photos to 256x256
 * before upload, so a real photo is a few tens of KB. The API still checks
 * everything itself: the declared type, that the bytes really are that type,
 * and the size.
 *
 * Demo storage keeps the photo as a data URL on the user record. Roadmap
 * Step 22 moves it to Supabase Storage.
 */

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Decoded size limit. 256x256 JPEGs are usually 10–40 KB. */
export const AVATAR_MAX_BYTES = 64 * 1024;

export class AvatarError extends Error {}

const DATA_URL =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

// File signatures ("magic bytes"), so a renamed file can't pass as an image.
const signatures: Record<
  (typeof AVATAR_TYPES)[number],
  (b: Buffer) => boolean
> = {
  'image/jpeg': (b) =>
    b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length > 8 &&
    b
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) =>
    b.length > 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP',
};

/** Returns the data URL unchanged if it's an acceptable photo; throws AvatarError otherwise. */
export function validateAvatar(dataUrl: string): string {
  const match = DATA_URL.exec(dataUrl);
  if (!match) {
    throw new AvatarError('Use a JPG, PNG or WebP image.');
  }
  const type = match[1] as (typeof AVATAR_TYPES)[number];
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > AVATAR_MAX_BYTES) {
    throw new AvatarError('That image is too large. Try a smaller photo.');
  }
  if (!signatures[type](bytes)) {
    throw new AvatarError("That file isn't a valid image.");
  }
  return dataUrl;
}
