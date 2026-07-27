import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { JudgeTokenRecord } from './judge-tokens.api';

export interface JudgeTokenStreamEvent {
  eventId: string;
  tokens: JudgeTokenRecord[];
}

/**
 * Wraps the native EventSource for GET /api/events/:eventId/judge-tokens/stream.
 * The backend sends plain `message` events with a JSON payload, and a named
 * `error` event on snapshot-fetch failures — both are surfaced here.
 */
@Injectable({ providedIn: 'root' })
export class JudgeTokenStreamService {
  connect(url: string): Observable<JudgeTokenStreamEvent> {
    return new Observable<JudgeTokenStreamEvent>((subscriber) => {
      const source = new EventSource(url);

      source.onmessage = (event) => {
        try {
          subscriber.next(JSON.parse(event.data) as JudgeTokenStreamEvent);
        } catch {
          // ignore malformed snapshot, wait for the next one
        }
      };

      source.addEventListener('error', () => {
        // The backend's named "error" event and the browser's connection-error
        // both land here; EventSource auto-reconnects on its own, so we just
        // let the stream keep running rather than completing/erroring it.
      });

      return () => source.close();
    });
  }
}
