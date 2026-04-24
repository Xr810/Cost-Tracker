require("./helpers/ts-register.cjs");

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  actionError,
  categoryDeleteBlockedMessage,
} = require("../lib/action-result.ts");

test("categoryDeleteBlockedMessage explains why a category cannot be deleted", () => {
  assert.equal(
    categoryDeleteBlockedMessage(3),
    "这个分类下还有 3 个物品。请先移动或删除这些物品，再删除分类。",
  );
});

test("actionError converts expected errors to action results", () => {
  assert.deepEqual(actionError(new Error("保存失败")), {
    ok: false,
    error: "保存失败",
  });
});
