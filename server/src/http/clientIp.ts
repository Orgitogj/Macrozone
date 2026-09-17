import { isIP } from 'node:net';

export function normalizeIp(value: string): string | null {
  const trimmed = value.trim();
  const unmapped = trimmed.toLowerCase().startsWith('::ffff:') && isIP(trimmed.slice(7)) === 4 ? trimmed.slice(7) : trimmed;
  return isIP(unmapped) === 0 ? null : unmapped.toLowerCase();
}

export function resolveClientIp(
  remoteAddress: string | undefined,
  forwardedFor: string | undefined,
  trustedProxies: ReadonlySet<string>,
): string {
  const peer = remoteAddress === undefined ? null : normalizeIp(remoteAddress);
  if (peer === null) {
    return 'unknown';
  }
  if (!trustedProxies.has(peer) || forwardedFor === undefined) {
    return peer;
  }
  const hops = forwardedFor.split(',');
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    const hop = normalizeIp(hops[index]);
    if (hop === null) {
      return peer;
    }
    if (!trustedProxies.has(hop)) {
      return hop;
    }
  }
  return peer;
}
