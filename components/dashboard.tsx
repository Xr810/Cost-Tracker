"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileUp,
  FolderPlus,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteCategoryAction,
  deleteItemAction,
  importMarkdownAction,
  signOutAction,
  upsertCategoryAction,
  upsertItemAction,
} from "@/app/actions";
import { computeItem, summarizeItems } from "@/lib/calculations";
import { exportInventoryMarkdown } from "@/lib/markdown";
import { centsToYuan, formatDateInput, formatYuan } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import { ITEM_STATUSES, PRICING_METHODS, type Category, type InventoryData, type InventoryItem } from "@/lib/types";

type DialogState =
  | { type: "item"; item?: InventoryItem }
  | { type: "category"; category?: Category }
  | { type: "import" }
  | { type: "export" }
  | null;

export function Dashboard({
  initialData,
  userEmail,
}: {
  initialData: InventoryData;
  userEmail: string;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");

  const computedItems = useMemo(
    () => initialData.items.map((item) => computeItem(item, initialData.categories)),
    [initialData],
  );
  const summary = summarizeItems(initialData.items);
  const filteredItems = computedItems.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.notes ?? "").toLowerCase().includes(query.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category_id === categoryFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesPricing = pricingFilter === "all" || item.pricing_method === pricingFilter;
    return matchesQuery && matchesCategory && matchesStatus && matchesPricing;
  });

  return (
    <main className="page-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Personal Inventory</p>
          <h1>物品资产管理</h1>
          <p className="subtle">用网页管理分类、物品状态和成本统计，不再需要手动编辑 Obsidian 表格。</p>
          <p className="subtle">当前账号：{userEmail}</p>
        </div>
        <div className="toolbar">
          <button className="button" type="button" onClick={() => setDialog({ type: "category" })}>
            <FolderPlus size={17} />
            新分类
          </button>
          <button className="button" type="button" onClick={() => setDialog({ type: "import" })}>
            <FileUp size={17} />
            导入
          </button>
          <button className="button" type="button" onClick={() => setDialog({ type: "export" })}>
            <Download size={17} />
            导出
          </button>
          <button className="button primary" type="button" onClick={() => setDialog({ type: "item" })}>
            <Plus size={17} />
            新物品
          </button>
          <form action={signOutAction}>
            <button className="icon-button" title="退出登录" type="submit">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </header>

      <section className="stats-grid" aria-label="资产统计">
        <Stat label="总物品数" value={`${summary.totalItems} 件`} />
        <Stat label="持有中" value={`${summary.ownedCount} 件`} />
        <Stat label="观望中" value={`${summary.watchCount} 件`} />
        <Stat label="净资产成本" value={formatYuan(summary.netCostCents)} />
      </section>

      <section className="panel">
        <div className="filters">
          <div className="field">
            <label htmlFor="search">搜索</label>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{ left: 11, position: "absolute", top: 12, color: "var(--muted)" }}
              />
              <input
                id="search"
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索物品或备注"
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>
          <FilterSelect label="分类" value={categoryFilter} onChange={setCategoryFilter}>
            <option value="all">全部分类</option>
            {initialData.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ` : ""}
                {category.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">全部状态</option>
            {ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="计价" value={pricingFilter} onChange={setPricingFilter}>
            <option value="all">全部计价</option>
            {PRICING_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>物品</th>
                <th>分类</th>
                <th>状态</th>
                <th>购买日期</th>
                <th>购买金额</th>
                <th>持有天数</th>
                <th>净成本</th>
                <th>均价</th>
                <th>备注</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    {item.category?.icon ? `${item.category.icon} ` : ""}
                    {item.category?.name ?? "未分类"}
                  </td>
                  <td>
                    <span className={`badge ${item.status === "观望中" ? "watch" : "owned"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.purchase_date ?? "-"}</td>
                  <td>{formatYuan(item.amount_cents)}</td>
                  <td>{item.holdingDays === null ? "-" : `${item.holdingDays} 天`}</td>
                  <td>{formatYuan(item.netCostCents)}</td>
                  <td>{item.averageLabel}</td>
                  <td className="notes">{item.notes ?? ""}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button" title="编辑" onClick={() => setDialog({ type: "item", item })}>
                        <Pencil size={15} />
                      </button>
                      <DeleteButton action={deleteItemAction} id={item.id} label="删除物品" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredItems.length ? (
            <div className="empty">
              <h2>还没有符合条件的物品</h2>
              <p className="subtle">添加第一个物品，或从 Obsidian Markdown 表格导入。</p>
            </div>
          ) : null}
        </div>
      </section>

      <CategoryStrip categories={initialData.categories} onEdit={(category) => setDialog({ type: "category", category })} />

      {dialog ? (
        <Dialog onClose={() => setDialog(null)}>
          {dialog.type === "item" ? (
            <ItemForm categories={initialData.categories} item={dialog.item} onDone={() => setDialog(null)} />
          ) : null}
          {dialog.type === "category" ? (
            <CategoryForm category={dialog.category} onDone={() => setDialog(null)} />
          ) : null}
          {dialog.type === "import" ? <ImportForm onDone={() => setDialog(null)} /> : null}
          {dialog.type === "export" ? (
            <ExportPanel markdown={exportInventoryMarkdown(initialData.categories, initialData.items)} />
          ) : null}
        </Dialog>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  );
}

function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <span />
          <button className="icon-button" type="button" onClick={onClose} title="关闭">
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ItemForm({
  categories,
  item,
  onDone,
}: {
  categories: Category[];
  item?: InventoryItem;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  return (
    <form
      action={(formData) => {
        setError("");
        startTransition(async () => {
          const result = await upsertItemAction(formData);
          if (result.ok) {
            router.refresh();
            onDone();
            return;
          }

          setError(result.error);
        });
      }}
    >
      <h2>{item ? "编辑物品" : "新增物品"}</h2>
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">物品名称</label>
          <input id="name" className="input" name="name" defaultValue={item?.name ?? ""} required />
        </div>
        <div className="field">
          <label htmlFor="category_id">分类</label>
          <select id="category_id" className="select" name="category_id" defaultValue={item?.category_id ?? categories[0]?.id} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ` : ""}
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="purchase_date">购买日期</label>
          <input id="purchase_date" className="input" type="date" name="purchase_date" defaultValue={formatDateInput(item?.purchase_date ?? null)} />
        </div>
        <div className="field">
          <label htmlFor="amount">金额(¥)</label>
          <input id="amount" className="input" name="amount" inputMode="decimal" defaultValue={item ? centsToYuan(item.amount_cents) : ""} />
        </div>
        <div className="field">
          <label htmlFor="status">状态</label>
          <select id="status" className="select" name="status" defaultValue={item?.status ?? "持有中"}>
            {ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pricing_method">计价</label>
          <select id="pricing_method" className="select" name="pricing_method" defaultValue={item?.pricing_method ?? "按天"}>
            {PRICING_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="usage_count">使用次数</label>
          <input id="usage_count" className="input" type="number" min="0" name="usage_count" defaultValue={item?.usage_count ?? 0} />
        </div>
        <div className="field">
          <label htmlFor="sale_amount">出售金额(¥)</label>
          <input id="sale_amount" className="input" name="sale_amount" inputMode="decimal" defaultValue={item ? centsToYuan(item.sale_amount_cents) : ""} />
        </div>
        <div className="field">
          <label htmlFor="retired_date">退役/卖出日期</label>
          <input id="retired_date" className="input" type="date" name="retired_date" defaultValue={formatDateInput(item?.retired_date ?? null)} />
        </div>
        <div className="field wide">
          <label htmlFor="notes">备注</label>
          <textarea id="notes" className="textarea" name="notes" defaultValue={item?.notes ?? ""} />
        </div>
      </div>
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  return (
    <form
      action={(formData) => {
        setError("");
        startTransition(async () => {
          const result = await upsertCategoryAction(formData);
          if (result.ok) {
            router.refresh();
            onDone();
            return;
          }

          setError(result.error);
        });
      }}
    >
      <h2>{category ? "编辑分类" : "新增分类"}</h2>
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="category_name">分类名称</label>
          <input id="category_name" className="input" name="name" defaultValue={category?.name ?? ""} required />
        </div>
        <div className="field">
          <label htmlFor="category_icon">图标</label>
          <input id="category_icon" className="input" name="icon" defaultValue={category?.icon ?? ""} placeholder="📱" />
        </div>
      </div>
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  return (
    <form
      className="import-export"
      action={(formData) => {
        setError("");
        startTransition(async () => {
          const result = await importMarkdownAction(formData);
          if (result.ok) {
            router.refresh();
            onDone();
            return;
          }

          setError(result.error);
        });
      }}
    >
      <h2>导入 Obsidian Markdown</h2>
      <p className="notice">粘贴当前 `物品资产管理.md` 中的完整内容或分类表格。导入会追加数据，不会覆盖已有物品。</p>
      <textarea className="textarea" name="markdown" rows={14} required />
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={isPending}>
          {isPending ? "导入中..." : "导入"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}

function ExportPanel({ markdown }: { markdown: string }) {
  return (
    <div className="import-export">
      <h2>导出 Obsidian Markdown</h2>
      <p className="notice">复制下面内容后，可以替换 Obsidian 中的物品表格。导出保留当前表头格式。</p>
      <textarea className="textarea" rows={18} readOnly value={markdown} />
    </div>
  );
}

function CategoryStrip({
  categories,
  onEdit,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <section className="panel" style={{ marginTop: 18, padding: 16 }}>
      <h2>分类</h2>
      <div className="toolbar" style={{ justifyContent: "flex-start" }}>
        {categories.map((category) => (
          <div className="badge" key={category.id}>
            {category.icon ? `${category.icon} ` : ""}
            {category.name}
            <button className="icon-button" style={{ marginLeft: 8, minHeight: 28, padding: "0 8px" }} onClick={() => onEdit(category)} title="编辑分类">
              <Pencil size={13} />
            </button>
            <DeleteButton action={deleteCategoryAction} id={category.id} label="删除分类" compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function DeleteButton({
  action,
  id,
  label,
  compact,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  id: string;
  label: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!window.confirm(`${label}？这个操作不可撤销。`)) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await action(formData);
          if (result.ok) {
            router.refresh();
            return;
          }

          window.alert(result.error);
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        className="icon-button"
        style={compact ? { minHeight: 28, padding: "0 8px" } : undefined}
        title={label}
        type="submit"
        disabled={isPending}
      >
        <Trash2 size={compact ? 13 : 15} />
      </button>
    </form>
  );
}
