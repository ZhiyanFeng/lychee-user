// Deprecated: authentication (login/register/logout) is handled entirely by
// Firebase via `AuthContext`/`useAuth()` — see src/contexts/AuthContext.tsx.
// This class previously duplicated login/register/logout calls against a
// custom backend, but had zero call sites anywhere in the app; those methods
// were dead code. The one legitimate remaining concern — backend *profile*
// data (name/phone/avatar/rating/move-count aggregates from the `users`
// table, which Firebase has no knowledge of) — now lives in
// `src/services/user.service.ts` (`userService`). This file is kept as an
// empty placeholder rather than deleted outright; safe to remove entirely.
export {};
