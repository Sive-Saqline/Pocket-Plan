import {
  Banknote,
  Car,
  Clapperboard,
  CreditCard,
  GraduationCap,
  HeartPulse,
  Landmark,
  Package,
  PiggyBank,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Tag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { WalletType } from "@/lib/ledger";

/**
 * Every icon in the app comes from lucide-react (see docs/ui-guide.md).
 * Categories store an icon key such as "food"; older accounts still hold the
 * emoji they were created with, so those map to the same keys.
 */

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Car,
  bills: ReceiptText,
  shopping: ShoppingBag,
  health: HeartPulse,
  education: GraduationCap,
  entertainment: Clapperboard,
  savings: PiggyBank,
  misc: Package,
};

const legacyEmojiKeys: Record<string, string> = {
  "🍔": "food",
  "🚗": "transport",
  "🧾": "bills",
  "🛍️": "shopping",
  "🛍": "shopping",
  "⚕️": "health",
  "⚕": "health",
  "🎒": "education",
  "🎬": "entertainment",
  "💰": "savings",
  "📦": "misc",
};

export function categoryIconFor(icon: string | undefined): LucideIcon {
  if (!icon) return Package;
  return categoryIcons[icon] ?? categoryIcons[legacyEmojiKeys[icon] ?? ""] ?? Tag;
}

const walletIcons: Record<WalletType, LucideIcon> = {
  CASH: Banknote,
  MOBILE_WALLET: Smartphone,
  BANK: Landmark,
  CARD: CreditCard,
  OTHER: Wallet,
};

type IconProps = Omit<LucideProps, "ref">;

/** Decorative by default: the category name is always shown next to it. */
export function CategoryIcon({ icon, size = 20, ...props }: IconProps & { icon: string | undefined }) {
  const Icon = categoryIconFor(icon);
  return <Icon aria-hidden size={size} strokeWidth={1.75} {...props} />;
}

export function WalletIcon({ type, size = 16, ...props }: IconProps & { type: WalletType }) {
  const Icon = walletIcons[type] ?? Wallet;
  return <Icon aria-hidden size={size} strokeWidth={1.75} {...props} />;
}

/** Round tile used for category icons in lists. */
export function CategoryBadge({ icon, className = "" }: { icon: string | undefined; className?: string }) {
  return (
    <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent ${className}`}>
      <CategoryIcon icon={icon} />
    </span>
  );
}
