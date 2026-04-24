export function isAllowedAdmin(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return false;
  }

  return email?.trim().toLowerCase() === adminEmail;
}

export function hasAdminEmailConfig() {
  return Boolean(process.env.ADMIN_EMAIL?.trim());
}
