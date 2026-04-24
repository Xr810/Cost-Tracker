export function yuanToCents(value: FormDataEntryValue | string | number | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") {
    return 0;
  }

  const normalized = raw.replace(/[¥,\s]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
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
