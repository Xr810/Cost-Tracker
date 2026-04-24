import { yuanToCents } from "@/lib/format";
import type { Category, InventoryItem, ItemStatus, PricingMethod } from "@/lib/types";
import { ITEM_STATUSES, PRICING_METHODS } from "@/lib/types";

export type MarkdownImportRow = {
  categoryName: string;
  item: {
    name: string;
    purchase_date: string | null;
    amount_cents: number;
    status: ItemStatus;
    pricing_method: PricingMethod;
    usage_count: number;
    sale_amount_cents: number;
    retired_date: string | null;
    notes: string | null;
  };
};

function cleanCell(value: string | undefined) {
  const trimmed = unescapeMarkdownCell(value ?? "").trim();
  return trimmed === "-" ? "" : trimmed;
}

function normalizeStatus(value: string): ItemStatus {
  return ITEM_STATUSES.includes(value as ItemStatus) ? (value as ItemStatus) : "持有中";
}

function normalizePricing(value: string): PricingMethod {
  return PRICING_METHODS.includes(value as PricingMethod) ? (value as PricingMethod) : "按天";
}

function stripEmojiHeading(heading: string) {
  return heading
    .replace(/^#+\s*/, "")
    .replace(/^[^\p{Letter}\p{Number}]+/u, "")
    .trim();
}

function splitMarkdownRow(line: string) {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of body) {
    if (char === "|" && !escaped) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
    escaped = char === "\\" && !escaped;
    if (char !== "\\") {
      escaped = false;
    }
  }

  cells.push(current.trim());
  return cells;
}

function escapeMarkdownCell(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "<br>")
    .replace(/\|/g, "\\|");
}

function unescapeMarkdownCell(value: string) {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/\\([\\|])/g, "$1");
}

export function parseInventoryMarkdown(markdown: string): MarkdownImportRow[] {
  const sections = markdown.split(/(?=^## )/m);
  const rows: MarkdownImportRow[] = [];

  for (const section of sections) {
    const headingMatch = section.match(/^## (.+)$/m);
    if (!headingMatch) {
      continue;
    }

    const heading = headingMatch[1].trim();
    if (/使用说明|统计面板/.test(heading)) {
      continue;
    }

    const categoryName = stripEmojiHeading(heading);
    const lines = section.split("\n").filter((line) => line.trim().startsWith("|"));
    if (lines.length < 3) {
      continue;
    }

    const headers = splitMarkdownRow(lines[0]);
    const required = ["物品", "购买日期", "金额(¥)", "状态", "计价", "使用次数", "出售金额", "退役日期", "备注"];
    if (!required.every((header) => headers.includes(header))) {
      continue;
    }

    for (const line of lines.slice(2)) {
      const cells = splitMarkdownRow(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, cleanCell(cells[index])]));
      const name = row["物品"];

      if (!name) {
        continue;
      }

      rows.push({
        categoryName,
        item: {
          name,
          purchase_date: row["购买日期"] || null,
          amount_cents: yuanToCents(row["金额(¥)"]),
          status: normalizeStatus(row["状态"]),
          pricing_method: normalizePricing(row["计价"]),
          usage_count: Number.parseInt(row["使用次数"] || "0", 10) || 0,
          sale_amount_cents: yuanToCents(row["出售金额"]),
          retired_date: row["退役日期"] || null,
          notes: row["备注"] || null,
        },
      });
    }
  }

  return rows;
}

function markdownAmount(cents: number) {
  if (!cents) {
    return "-";
  }

  const yuan = cents / 100;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
}

function markdownDate(value: string | null) {
  return value || "-";
}

function markdownText(value: string | null | undefined) {
  return escapeMarkdownCell(value);
}

export function exportInventoryMarkdown(categories: Category[], items: InventoryItem[]) {
  const lines: string[] = [
    "---",
    "title: 物品资产管理",
    "tags: [project/inventory]",
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    "# 物品资产管理表",
    "",
    "> 记录物品全生命周期：从种草 → 购买 → 使用 → 退役 / 出售。",
    "> 支持按天或按次两种计价方式。",
    "",
    "---",
  ];

  for (const category of categories) {
    const categoryItems = items.filter((item) => item.category_id === category.id);
    lines.push("", `## ${category.icon ?? ""} ${category.name}`.trim(), "");
    lines.push("| 物品 | 购买日期 | 金额(¥) | 状态 | 计价 | 使用次数 | 出售金额 | 退役日期 | 备注 |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");

    if (!categoryItems.length) {
      lines.push("|  |  |  |  |  |  |  |  |  |");
    }

    for (const item of categoryItems) {
      const cells = [
        markdownText(item.name),
        markdownDate(item.purchase_date),
        markdownAmount(item.amount_cents),
        item.status,
        item.pricing_method,
        item.usage_count || "-",
        markdownAmount(item.sale_amount_cents),
        markdownDate(item.retired_date),
        markdownText(item.notes),
      ];
      lines.push(`| ${cells.join(" | ")} |`);
    }
  }

  return `${lines.join("\n")}\n`;
}
