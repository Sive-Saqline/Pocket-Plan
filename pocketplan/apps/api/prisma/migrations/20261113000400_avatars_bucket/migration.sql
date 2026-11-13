-- Profile photos in Supabase Storage.
--
-- * Public bucket: anyone with a photo's URL can view it (needed for <img>).
--   File names are random, so URLs can't be guessed or listed.
-- * Only the API uploads and deletes, using the service role key, after
--   validating the image (apps/api/src/users/avatar.ts). No storage policies
--   are added, so the public and signed-in roles can't write here directly.
-- * The bucket itself also refuses anything over 64 KB or that isn't a
--   JPG/PNG/WebP.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 65536, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
