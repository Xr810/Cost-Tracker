import { ZodError } from "zod";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const actionOk: ActionResult = { ok: true };

export function categoryDeleteBlockedMessage(count: number) {
  return `这个分类下还有 ${count} 个物品。请先移动或删除这些物品，再删除分类。`;
}

export function actionError(error: unknown): ActionResult {
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "表单内容无效。" };
  }

  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: "操作失败，请稍后重试。" };
}
