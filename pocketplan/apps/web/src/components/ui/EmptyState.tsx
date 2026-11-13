import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Centred "nothing here yet" block: icon, title, short help text, optional actions. */
export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span aria-hidden className="mb-1 grid size-14 place-items-center rounded-full bg-accent/10 text-accent">
        <Icon size={28} strokeWidth={1.75} />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-text-muted">{text}</p>}
      {children && <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
