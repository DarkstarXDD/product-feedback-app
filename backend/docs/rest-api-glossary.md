# Backend Auth & API Terms Glossary

This file defines common terms used in this backend and shows examples using routes like `/api/v1/users/:username`.

## Actor

The actor is the requester who initiated the current HTTP request.

- Authenticated actor: a specific logged-in user from token/session.
- Anonymous actor: a public caller with no login.

Example:

- `PATCH /api/v1/users/jane` with John's token -> actor is John.
- `GET /api/v1/users/jane` without token -> actor is anonymous.

## Authentication (AuthN)

Authentication verifies identity: "Who are you?"

Example:

- Validate JWT from cookie/header.
- If valid, attach user identity to request context.

Typical outcomes:

- Missing/invalid token on protected route -> `401 Unauthorized`.
- Valid token -> request continues.

## Authorization (AuthZ)

Authorization decides permissions: "What are you allowed to do?"

Example:

- `GET /api/v1/users` allowed only for `ADMIN`.
- `PATCH /api/v1/users/:username` allowed for `ADMIN` or owner.

Typical outcome:

- Logged in but lacking permission -> `403 Forbidden`.

## Role

Role is a coarse permission group assigned to a user.

Examples:

- `ADMIN`
- `USER`

Role checks are broad rules, such as "admins can list all users".

## Ownership

Ownership is resource-specific access based on identity match.

Example rule:

- user can edit/delete own account only.
- `actor.id === targetUser.id` (or `actor.username === routeParamUsername`).

Why it matters:

- Two users can share role `USER`, but only one owns `/:username` target.

## Role vs Ownership

Role and ownership are not the same.

Example:

- John (`USER`) tries `PATCH /api/v1/users/jane`.
- Role check (`USER`) may pass in a loose system.
- Ownership check fails because John is not Jane.
- Correct policy denies access unless actor is `ADMIN`.

Common policy:

- `selfOrAdmin = actor.role === "ADMIN" || actor.id === target.id`

## DTO (Data Transfer Object)

DTO is the explicit API data shape sent to clients (or accepted from clients).

Purpose:

- Define stable API contracts.
- Prevent accidental leakage of internal/sensitive fields.

Examples:

- `PublicUserDTO`: `{ username, name, avatarUrl }`
- `PrivateUserDTO`: `{ username, name, email, role }`

## Prisma `select`

Prisma `select` chooses which DB columns are fetched.

Example:

```ts
const user = await prisma.user.findUnique({
  where: { username },
  select: { id: true, username: true, email: true },
})
```

## DTO vs Prisma `select`

They solve different layers:

- `select`: DB query minimization (what comes from database).
- DTO/serializer: API contract control (what leaves API).

Best practice:

1. Use Prisma `select` for minimal reads.
2. Map to DTO before returning response.

## Serializer

A serializer maps DB/domain objects into response DTOs.

Examples:

- `toPublicUserDTO(user)` -> excludes email.
- `toPrivateUserDTO(user)` -> includes email.

Useful for:

- `GET /users/:username` where response changes by caller permissions.

## Public Route

A public route can be called without login.

Example:

- `GET /api/v1/users/:username`

Note:

- Public route does not mean all fields are public.
- You can still return public-only DTO unless actor is self/admin.

## Protected Route

A protected route requires valid authentication.

Examples:

- `PATCH /api/v1/users/:username`
- `DELETE /api/v1/users/:username`
- `GET /api/v1/users` (admin-only list)

## Optional Authentication

Optional auth means route accepts both anonymous and logged-in callers.

Use case:

- `GET /api/v1/users/:username`
- If token exists and valid, actor context is available.
- If no token, continue as anonymous actor.

## Policy

A policy is a reusable authorization rule.

Examples:

- `canViewPrivateUser(actor, target)`
- `canManageUser(actor, target)`

Benefit:

- Centralizes rules so handlers stay simple and consistent.

## Canonical Route

Canonical route is the primary standard route shape for a resource.

Example:

- Canonical: `/api/v1/users/:username`
- Convenience alias: `/api/v1/users/me`

Both can point to the same underlying user resource.

## Target Resource

Target is the resource being acted on, identified by URL params.

Example:

- In `PATCH /api/v1/users/jane`, target user is Jane.
- Actor is the caller (e.g., John).

## 401 vs 403

Use status codes consistently:

- `401 Unauthorized`: authentication missing/invalid.
- `403 Forbidden`: authenticated but not permitted.

Example:

- No token on `PATCH /users/jane` -> `401`.
- John token on `PATCH /users/jane` without admin role -> `403`.

## Route Examples (Our Desired Model)

- `GET /api/v1/users`
  - Auth required.
  - Allow only `ADMIN`.
- `GET /api/v1/users/:username`
  - Public access allowed.
  - Return private DTO only for self/admin.
  - Return public DTO for others.
- `PATCH /api/v1/users/:username`
  - Auth required.
  - Allow self or admin.
- `DELETE /api/v1/users/:username`
  - Auth required.
  - Allow self or admin.

## RBAC (Role-Based Access Control)

RBAC grants permissions based on user roles.

How it works:

- Assign users to roles (for example, `ADMIN`, `USER`).
- Assign actions to roles.
- Allow/deny requests by checking the actor's role.

Example:

- `GET /api/v1/users` -> only `ADMIN` can access.
- Rule shape: `allow if actor.role in ["ADMIN"]`.

Good for:

- Simple, predictable permission models.

## ABAC (Attribute-Based Access Control)

ABAC grants permissions based on attributes, not only role.

Attributes can include:

- Actor attributes: `id`, `role`, `status`.
- Resource attributes: owner id, privacy flags (`isPrivate`).
- Request attributes: HTTP method, route params.
- Environment attributes: time, tenant, IP/network.

Example:

- `PATCH /api/v1/users/:username`
- Allow if actor is admin OR actor owns target user.
- Rule shape: `allow if actor.role === "ADMIN" || actor.id === target.id`.

Another example:

- `GET /api/v1/users/:username`
- Public can access basic profile.
- Private fields (email) shown only if actor is admin or owner.

Good for:

- Fine-grained and context-aware permissions.

## RBAC vs ABAC (Quick Comparison)

- RBAC: role-only decisions. Easier to implement, less flexible.
- ABAC: decisions from multiple attributes. More flexible, more complex.

In this project:

- `GET /users` admin-only is RBAC-like.
- `PATCH/DELETE /users/:username` self-or-admin is ABAC-like (role + ownership attribute).
