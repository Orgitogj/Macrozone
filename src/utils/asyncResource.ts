export type AsyncResource<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T; refreshError: string | null };

export function createLoadingResource<T>(): AsyncResource<T> {
  return { status: 'loading' };
}

export function resolveLoadSuccess<T>(_current: AsyncResource<T>, data: T): AsyncResource<T> {
  return { status: 'ready', data, refreshError: null };
}

export function resolveLoadFailure<T>(current: AsyncResource<T>, message: string): AsyncResource<T> {
  return current.status === 'ready' ? { ...current, refreshError: message } : { status: 'error', message };
}

export function resolveRetry<T>(current: AsyncResource<T>): AsyncResource<T> {
  return current.status === 'ready' ? { ...current, refreshError: null } : { status: 'loading' };
}

export function getResourceData<T>(resource: AsyncResource<T>): T | null {
  return resource.status === 'ready' ? resource.data : null;
}
