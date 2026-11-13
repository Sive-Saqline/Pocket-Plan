/* eslint-disable @next/next/no-img-element -- data URLs can't go through next/image */

/**
 * The signed-in user's picture: their profile photo, or the first letter of
 * their name on the accent colour. Decorative: the name is always shown or
 * announced next to it. Size it with a `size-*` class.
 */
export function UserAvatar({
  name,
  avatarUrl,
  className = "size-9 text-sm",
}: {
  name: string;
  avatarUrl: string | null | undefined;
  className?: string;
}) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" aria-hidden className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-text-inverse ${className}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
