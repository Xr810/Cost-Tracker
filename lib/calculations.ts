import type { Category, ComputedItem, InventoryItem, SummaryStats } from "@/lib/types";
import { formatYuan } from "@/lib/format";

const DAY_MS = 86_400_000;

function startOfLocalDay(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateHoldingDays(item: InventoryItem, today = new Date()) {
  const purchaseDate = parseDate(item.purchase_date);
  if (!purchaseDate) {
    return null;
  }

  const endDate =
    /已退役|已卖出/.test(item.status) && item.retired_date
      ? parseDate(item.retired_date)
      : startOfLocalDay(today);

  if (!endDate) {
    return null;
  }

  return Math.max(0, Math.floor((startOfLocalDay(endDate).getTime() - purchaseDate.getTime()) / DAY_MS));
}

export function computeItem(
  item: InventoryItem,
  categories: Category[],
  today = new Date(),
): ComputedItem {
  const holdingDays = calculateHoldingDays(item, today);
  const netCostCents = item.amount_cents - item.sale_amount_cents;
  let averageLabel = "-";

  if (!/观望/.test(item.status)) {
    if (item.pricing_method === "按天" && holdingDays && holdingDays > 0) {
      averageLabel = `${formatYuan(Math.round(netCostCents / holdingDays))}/天`;
    }

    if (item.pricing_method === "按次" && item.usage_count > 0) {
      averageLabel = `${formatYuan(Math.round(netCostCents / item.usage_count))}/次`;
    }
  }

  return {
    ...item,
    category: categories.find((category) => category.id === item.category_id),
    holdingDays,
    netCostCents,
    averageLabel,
  };
}

export function summarizeItems(items: InventoryItem[]): SummaryStats {
  const active = items.filter((item) => !/观望/.test(item.status));

  return {
    totalItems: items.length,
    ownedCount: items.filter((item) => /持有/.test(item.status)).length,
    watchCount: items.filter((item) => /观望/.test(item.status)).length,
    netCostCents: active.reduce(
      (sum, item) => sum + item.amount_cents - item.sale_amount_cents,
      0,
    ),
  };
}
