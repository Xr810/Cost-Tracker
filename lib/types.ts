export const ITEM_STATUSES = ["观望中", "持有中", "已退役", "咸鱼ing", "已卖出"] as const;
export const PRICING_METHODS = ["按天", "按次"] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type PricingMethod = (typeof PRICING_METHODS)[number];

export type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type InventoryItem = {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  purchase_date: string | null;
  amount_cents: number;
  status: ItemStatus;
  pricing_method: PricingMethod;
  usage_count: number;
  sale_amount_cents: number;
  retired_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryData = {
  categories: Category[];
  items: InventoryItem[];
};

export type ComputedItem = InventoryItem & {
  category?: Category;
  holdingDays: number | null;
  netCostCents: number;
  averageLabel: string;
};

export type SummaryStats = {
  totalItems: number;
  ownedCount: number;
  watchCount: number;
  netCostCents: number;
};
