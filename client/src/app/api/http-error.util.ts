import { HttpErrorResponse } from '@angular/common/http';

export function toApiError(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | string | null;
    const serverMessage =
      typeof body === 'string' ? body : typeof body?.error === 'string' ? body.error : '';
    const statusLabel = `HTTP ${err.status}`;
    return new Error(serverMessage ? `${serverMessage} (${statusLabel})` : `${fallback} (${statusLabel})`);
  }
  return new Error(fallback);
}
