export function isAllowedAdmin(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return true;
  }

  return email?.trim().toLowerCase() === adminEmail;
}
