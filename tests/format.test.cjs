require("./helpers/ts-register.cjs");

const assert = require("node:assert/strict");
const test = require("node:test");
const { yuanToCents } = require("../lib/format.ts");

test("yuanToCents parses blank, integer, comma, and decimal values", () => {
  assert.equal(yuanToCents(""), 0);
  assert.equal(yuanToCents("-"), 0);
  assert.equal(yuanToCents("1,299"), 129900);
  assert.equal(yuanToCents("19.9"), 1990);
  assert.equal(yuanToCents("19.99"), 1999);
});

test("yuanToCents rejects invalid or negative values", () => {
  assert.throws(() => yuanToCents("abc"), /金额必须是非负数字/);
  assert.throws(() => yuanToCents("-1"), /金额必须是非负数字/);
  assert.throws(() => yuanToCents("1.999"), /金额必须是非负数字/);
});
