export type AccountWriteBlock = (accountKey: string) => boolean;

let blocked: AccountWriteBlock = () => false;

export function setAccountWriteBlock(next: AccountWriteBlock | null): void {
  blocked = next ?? (() => false);
}

export function isAccountWriteBlocked(accountKey: string): boolean {
  return blocked(accountKey);
}
