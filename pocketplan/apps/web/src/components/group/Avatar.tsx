const palette = [
  "bg-[var(--chart-1)]",
  "bg-[var(--chart-2)]",
  "bg-[var(--chart-3)]",
  "bg-[var(--chart-4)]",
  "bg-[var(--chart-6)]",
];

export function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <span
      aria-hidden
      className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${palette[index % palette.length]}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
