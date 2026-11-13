import { AVATAR_MAX_BYTES, AvatarError, validateAvatar } from './avatar';

const dataUrl = (type: string, bytes: Buffer) =>
  `data:${type};base64,${bytes.toString('base64')}`;

const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(100),
]);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(100),
]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.alloc(100),
]);

describe('validateAvatar', () => {
  it.each([
    ['image/jpeg', jpeg],
    ['image/png', png],
    ['image/webp', webp],
  ])('accepts a real %s', (type, bytes) => {
    const url = dataUrl(type, bytes);
    expect(validateAvatar(url)).toBe(url);
  });

  it('rejects other types, including SVG (which can carry scripts)', () => {
    expect(() =>
      validateAvatar(dataUrl('image/gif', Buffer.from('GIF89a'))),
    ).toThrow('Use a JPG, PNG or WebP image.');
    expect(() =>
      validateAvatar(
        dataUrl('image/svg+xml', Buffer.from('<svg onload="alert(1)"/>')),
      ),
    ).toThrow(AvatarError);
  });

  it('rejects a file whose bytes do not match its declared type', () => {
    expect(() => validateAvatar(dataUrl('image/jpeg', png))).toThrow(
      "That file isn't a valid image.",
    );
    expect(() =>
      validateAvatar(dataUrl('image/png', Buffer.from('not an image'))),
    ).toThrow(AvatarError);
  });

  it('rejects anything that is not a base64 data URL', () => {
    for (const bad of [
      '',
      'https://example.com/me.jpg',
      'data:image/png,raw',
      'data:image/png;base64,***',
    ]) {
      expect(() => validateAvatar(bad)).toThrow(AvatarError);
    }
  });

  it('enforces the size limit', () => {
    const atLimit = Buffer.concat([
      jpeg,
      Buffer.alloc(AVATAR_MAX_BYTES - jpeg.length),
    ]);
    expect(() => validateAvatar(dataUrl('image/jpeg', atLimit))).not.toThrow();
    const tooBig = Buffer.concat([atLimit, Buffer.alloc(1)]);
    expect(() => validateAvatar(dataUrl('image/jpeg', tooBig))).toThrow(
      'That image is too large. Try a smaller photo.',
    );
  });
});
