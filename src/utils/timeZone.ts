export function getDeviceTimeZone(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timeZone === 'string' && timeZone.length > 0 ? timeZone : null;
  } catch {
    return null;
  }
}
