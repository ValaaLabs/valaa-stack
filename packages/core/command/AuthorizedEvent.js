// Name "AuthorizedEvent" is a bit redundant as events are always by definition authorized.
// But plain Event conflicts with HTML Event type (and is a tad generic).
export type AuthorizedEvent = { type: string };
