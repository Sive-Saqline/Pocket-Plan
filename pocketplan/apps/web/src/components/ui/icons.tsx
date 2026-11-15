import {
  Baby,
  Banknote,
  BriefcaseBusiness,
  Car,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Package,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
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

/**
 * The icons a category can use, in picker order. The API accepts exactly
 * these keys (apps/api/src/ledger/ledger.types.ts, CATEGORY_ICONS).
 */
export const CATEGORY_ICON_OPTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "food", label: "Food", icon: UtensilsCrossed },
  { key: "groceries", label: "Groceries", icon: ShoppingBasket },
  { key: "coffee", label: "Coffee & snacks", icon: Coffee },
  { key: "transport", label: "Transport", icon: Car },
  { key: "fuel", label: "Fuel", icon: Fuel },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "bills", label: "Bills", icon: ReceiptText },
  { key: "home", label: "Home & rent", icon: House },
  { key: "phone", label: "Phone & internet", icon: Smartphone },
  { key: "shopping", label: "Shopping", icon: ShoppingBag },
  { key: "health", label: "Health", icon: HeartPulse },
  { key: "beauty", label: "Personal care", icon: Sparkles },
  { key: "sports", label: "Fitness", icon: Dumbbell },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "work", label: "Work", icon: BriefcaseBusiness },
  { key: "entertainment", label: "Entertainment", icon: Clapperboard },
  { key: "family", label: "Family & kids", icon: Baby },
  { key: "pets", label: "Pets", icon: PawPrint },
  { key: "gift", label: "Gifts", icon: Gift },
  { key: "charity", label: "Charity", icon: HandHeart },
  { key: "savings", label: "Savings", icon: PiggyBank },
  { key: "misc", label: "Miscellaneous", icon: Package },
  { key: "tag", label: "Other", icon: Tag },
];

const categoryIcons: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((o) => [o.key, o.icon]),
);

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
