# Middleware Optimization Notes

## Deferred optimization: split auth verification from user hydration

### Current approach

- `resolveAuthUser` verifies JWT and hydrates `user` from DB in one middleware.
- This runs on routes that include `resolveAuthUser`, including routes where only optional auth context may be needed.

### Potential future improvement

- Split into two steps:
  1. `resolveAuth`: verify token and set `jwtPayload` only.
  2. Lazy hydration: load `user` only when `requireAuth`, `requireRole`, or resource-access middleware actually needs it.

### Why this is deferred

- Current behavior is correct and keeps role/user state fresh from DB.
- Optimization should be driven by profiling evidence (DB read pressure / latency hot path), not by assumption.

### If revisited later

- Add a shared `hydrateAuthUserIfNeeded` helper to avoid duplicate logic.
- Ensure role checks continue to use DB-backed user state (avoid stale JWT role claims).
- Add/adjust tests for unauthenticated, invalid token, deleted user, role-changed user.
