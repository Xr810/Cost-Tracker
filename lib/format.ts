export function yuanToCents(
  value: FormDataEntryValue | string | number | null | undefined,
  label = "金额",
) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") {
    return 0;
  }

  const normalized = raw.replace(/[¥,\s]/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${label}必须是非负数字，最多保留两位小数。`);
  }

  const [yuan, decimal = ""] = normalized.split(".");
  const cents = Number(yuan) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`${label}超出可保存范围。`);
  }

  return cents;
}

export function centsToYuan(cents: number) {
  return cents / 100;
}

export function formatYuan(cents: number) {
  return `${centsToYuan(cents).toLocaleString("zh-CN", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ¥`;
}

export function formatDateInput(date: string | null) {
  return date ?? "";
}
