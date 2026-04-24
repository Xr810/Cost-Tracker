import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Category, InventoryData, InventoryItem } from "@/lib/types";

const DEFAULT_CATEGORIES = [
  { name: "电子产品", icon: "📱", sort_order: 10 },
  { name: "家具", icon: "🛋️", sort_order: 20 },
  { name: "其他", icon: "📦", sort_order: 30 },
];

export async function ensureDefaultCategories(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (count && count > 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("categories")
    .insert(DEFAULT_CATEGORIES.map((category) => ({ ...category, user_id: userId })));

  if (insertError) {
    throw insertError;
  }
}

export async function getInventoryData(userId: string): Promise<InventoryData> {
  const supabase = await createServerSupabaseClient();
  const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (categoriesError) {
    throw categoriesError;
  }

  if (itemsError) {
    throw itemsError;
  }

  return {
    categories: (categories ?? []) as Category[],
    items: (items ?? []) as InventoryItem[],
  };
}
