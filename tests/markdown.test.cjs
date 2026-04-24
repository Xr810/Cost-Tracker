require("./helpers/ts-register.cjs");

const assert = require("node:assert/strict");
const test = require("node:test");
const { exportInventoryMarkdown, parseInventoryMarkdown } = require("../lib/markdown.ts");

test("markdown export/import preserves table pipes and note newlines", () => {
  const categories = [
    {
      id: "category-1",
      user_id: "user-1",
      name: "电子产品",
      icon: "📱",
      sort_order: 10,
      created_at: "2026-04-25T00:00:00Z",
      updated_at: "2026-04-25T00:00:00Z",
    },
  ];
  const items = [
    {
      id: "item-1",
      user_id: "user-1",
      category_id: "category-1",
      name: "键盘 | 低轴",
      purchase_date: "2026-04-01",
      amount_cents: 199900,
      status: "持有中",
      pricing_method: "按天",
      usage_count: 0,
      sale_amount_cents: 0,
      retired_date: null,
      notes: "第一行\n第二行 | 带竖线",
      created_at: "2026-04-25T00:00:00Z",
      updated_at: "2026-04-25T00:00:00Z",
    },
  ];

  const markdown = exportInventoryMarkdown(categories, items);
  assert.match(markdown, /键盘 \\\| 低轴/);
  assert.match(markdown, /第二行 \\\| 带竖线/);

  const rows = parseInventoryMarkdown(markdown);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].categoryName, "电子产品");
  assert.equal(rows[0].item.name, "键盘 | 低轴");
  assert.equal(rows[0].item.notes, "第一行\n第二行 | 带竖线");
  assert.equal(rows[0].item.amount_cents, 199900);
});
