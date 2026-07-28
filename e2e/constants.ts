/**
 * Credentials for the shared dev Supabase database (also used by the live
 * app and the backend teammate's worktree). These are verified-working dev
 * credentials, not secrets - do not point this suite at production.
 *
 * IMPORTANT: tests must never call destructive endpoints against this event
 * (POST /events/:id/start, bulk-deleting the only event's candidates, etc.)
 * - see CLAUDE.md / task instructions.
 */
export const ROOT_PASSWORD = 'rootpassword';
export const EVENT_ID = 'ev_demo_2026';
export const EVENT_CODE = '00001';
export const EVENT_MANAGER_PASSWORD = 'evento01';
