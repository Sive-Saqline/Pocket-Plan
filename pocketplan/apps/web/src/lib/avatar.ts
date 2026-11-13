/**
 * Turns a chosen photo into a small square JPEG ready to upload as a profile
 * picture: centre-cropped to a square, scaled to 256x256, and compressed to
 * stay under the API's 64 KB limit (apps/api/src/users/avatar.ts).
 */

export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED = AVATAR_ACCEPT.split(",");
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // what we're willing to read from disk
const SIZE = 256;
// Base64 is 4/3 of the bytes; stay safely below the API's 64 KB limit.
const MAX_DATA_URL_LENGTH = 80_000;

export class AvatarFileError extends Error {}

export async function prepareAvatar(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new AvatarFileError("Use a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new AvatarFileError("That image is over 10 MB. Choose a smaller one.");
  }

  let bitmap: ImageBitmap;
  try {
    // Honours phone-camera rotation (EXIF) in current browsers.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new AvatarFileError("That image couldn't be opened. Try another one.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AvatarFileError("Your browser couldn't process the image.");
  // JPEG has no transparency: give transparent PNGs a white background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
  }
  throw new AvatarFileError("That image is too detailed to shrink enough. Try another one.");
}
