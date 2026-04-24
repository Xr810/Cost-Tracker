"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actionError,
  actionOk,
  categoryDeleteBlockedMessage,
  type ActionResult,
} from "@/lib/action-result";
import { isAllowedAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ITEM_STATUSES, PRICING_METHODS } from "@/lib/types";
import { parseInventoryMarkdown } from "@/lib/markdown";
import { yuanToCents } from "@/lib/format";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowedAdmin(user.email)) {
    throw new Error("当前账号无权访问此后台。");
  }

  return { supabase, user };
}

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "分类名称不能为空").max(60),
  icon: z.string().trim().max(8).optional(),
});

const dateSchema = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "日期格式无效");

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().trim().min(1, "物品名称不能为空").max(120),
  purchase_date: dateSchema.optional(),
  amount: z.string().optional(),
  status: z.enum(ITEM_STATUSES),
  pricing_method: z.enum(PRICING_METHODS),
  usage_count: z.coerce.number().int().min(0).default(0),
  sale_amount: z.string().optional(),
  retired_date: dateSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

function formValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function optionalFormValue(formData: FormData, key: string) {
  return formValue(formData, key) || undefined;
}

async function ensureOwnCategory(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  categoryId: string,
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("请选择当前账号下的有效分类。");
  }
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function upsertCategoryAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  try {
    const parsed = categorySchema.parse({
      id: optionalFormValue(formData, "id"),
      name: formValue(formData, "name"),
      icon: optionalFormValue(formData, "icon"),
    });

    if (parsed.id) {
      const { error } = await supabase
        .from("categories")
        .update({ name: parsed.name, icon: parsed.icon || null })
        .eq("id", parsed.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }
    } else {
      const { count, error: countError } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        throw countError;
      }

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: parsed.name,
        icon: parsed.icon || null,
        sort_order: (count ?? 0) * 10 + 10,
      });

      if (error) {
        throw error;
      }
    }

    revalidatePath("/");
    return actionOk;
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  try {
    const id = z.string().uuid().parse(formValue(formData, "id"));
    const { count, error: countError } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .eq("user_id", user.id);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) > 0) {
      return { ok: false, error: categoryDeleteBlockedMessage(count ?? 0) };
    }

    const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/");
    return actionOk;
  } catch (error) {
    return actionError(error);
  }
}

export async function upsertItemAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  try {
    const parsed = itemSchema.parse({
      id: optionalFormValue(formData, "id"),
      category_id: formValue(formData, "category_id"),
      name: formValue(formData, "name"),
      purchase_date: formValue(formData, "purchase_date"),
      amount: formValue(formData, "amount"),
      status: formValue(formData, "status"),
      pricing_method: formValue(formData, "pricing_method"),
      usage_count: formValue(formData, "usage_count") || 0,
      sale_amount: formValue(formData, "sale_amount"),
      retired_date: formValue(formData, "retired_date"),
      notes: formValue(formData, "notes"),
    });

    await ensureOwnCategory(supabase, user.id, parsed.category_id);

    const payload = {
      user_id: user.id,
      category_id: parsed.category_id,
      name: parsed.name,
      purchase_date: parsed.purchase_date || null,
      amount_cents: yuanToCents(parsed.amount, "购买金额"),
      status: parsed.status,
      pricing_method: parsed.pricing_method,
      usage_count: parsed.usage_count,
      sale_amount_cents: yuanToCents(parsed.sale_amount, "出售金额"),
      retired_date: parsed.retired_date || null,
      notes: parsed.notes || null,
    };

    if (parsed.id) {
      const { error } = await supabase
        .from("items")
        .update(payload)
        .eq("id", parsed.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase.from("items").insert(payload);

      if (error) {
        throw error;
      }
    }

    revalidatePath("/");
    return actionOk;
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteItemAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  try {
    const id = z.string().uuid().parse(formValue(formData, "id"));
    const { error } = await supabase.from("items").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/");
    return actionOk;
  } catch (error) {
    return actionError(error);
  }
}

export async function importMarkdownAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  try {
    const markdown = formValue(formData, "markdown");
    const rows = parseInventoryMarkdown(markdown);

    if (!rows.length) {
      throw new Error("没有识别到可导入的物品表格。");
    }

    const { data: existingCategories, error: categoryError } = await supabase
      .from("categories")
      .select("id,name")
      .eq("user_id", user.id);

    if (categoryError) {
      throw categoryError;
    }

    const categoryMap = new Map((existingCategories ?? []).map((category) => [category.name, category.id]));
    const uniqueCategoryNames = Array.from(new Set(rows.map((row) => row.categoryName)));

    for (const name of uniqueCategoryNames) {
      if (categoryMap.has(name)) {
        continue;
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name,
          sort_order: categoryMap.size * 10 + 10,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      categoryMap.set(name, data.id);
    }

    const payload = rows.map((row) => ({
      user_id: user.id,
      category_id: categoryMap.get(row.categoryName),
      ...row.item,
    }));

    const { error: insertError } = await supabase.from("items").insert(payload);

    if (insertError) {
      throw insertError;
    }

    revalidatePath("/");
    return actionOk;
  } catch (error) {
    return actionError(error);
  }
}
