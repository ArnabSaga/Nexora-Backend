# Nexora Progress Tracker

## How to Use This File

Update this file after every development session. This is the single source of truth for current progress, next task, blockers, completed modules, and open decisions.

---

## Project Status Snapshot

| Field | Current Value |
|---|---|
| Project | Nexora |
| Product Type | Social-professional community platform |
| Current Phase | Phase 1 — Foundation |
| Current Focus | Build MVP content modules |
| Overall MVP Status | Not Started |
| Frontend Status | Not Started |
| Backend Status | In Progress |
| Database Status | MVP schema implemented and Prisma-validated |
| API Status | Auth, user/follow, and profile routes implemented |
| UI System Status | Tokens/rules/registry drafted |
| Last Updated | 2026-07-14 |

---

## Current Task

| Item | Details |
|---|---|
| Task | Build profile module |
| Owner | Developer |
| Status | Implemented |
| Expected Output | `/api/v1/profiles` and `/api/v1/profile` expose profile identity, media, experience, education, and skill management |
| Acceptance Criteria | TypeScript, Prisma validation, and production build pass |

---

## Next Task

| Priority | Task | Type | Dependency |
|---|---|---|---|
| 1 | Build post media upload and post create/feed routes | Backend | Upload helpers + profile/user modules |
| 2 | Build comment/reaction/vote routes | Backend | Post module |
| 3 | Build admin dashboard/report moderation endpoints | Backend | Most content/community modules |
| 4 | Setup frontend app | Frontend | Backend route contracts |

---

## Active Blockers

| Blocker | Impact | Resolution Plan | Status |
|---|---|---|---|
| Repository structure not finalized | Affects setup commands and imports | Choose monorepo or separate frontend/backend repos | Open |
| UI mock/reference images not added yet | Affects exact visual styling | Add design reference images later under `context/designs/` | Open |
| SMTP credentials required in deployed env | Email verification and password reset need SMTP envs to send real emails | Set `MAIL_SMTP_*` variables in deployment | Open |
| Google OAuth callback/session behavior needs live verification | `/api/v1/auth/google/success` depends on Better Auth setting the session cookie before frontend calls it | Test with real Google OAuth credentials and browser cookies | Open |
| Shadow database URL not set locally | Prisma migration diff against migrations needs a shadow database | Set `SHADOW_DATABASE_URL` before running migration drift checks | Open |

---

## Completed Documentation

| Document | Status | Notes |
|---|---|---|
| project-overview.md | Done | Nexora-specific product scope |
| architecture.md | Done | Includes folder structure, ERD, API route summary |
| build-plan.md | Done | Feature-by-feature UI + logic steps |
| code-standards.md | Done | Backend/frontend coding rules |
| library-docs.md | Done | Library usage examples with code snippets |
| ui-rules.md | Done | Nexora visual/product UI rules |
| ui-tokens.md | Done | Nexora design tokens |
| ui-registry.md | Done | Component registry template and planned components |
| progress-tracker.md | Done | Actionable tracking system |

---

## Module Progress

### Backend Modules

| Priority | Module | Status | Current Task | Next Task | Blocker |
|---|---|---|---|---|---|
| 1 | Foundation | In Progress | Middleware, error helpers, and app wiring compile | Add route registry | None |
| 2 | Auth | In Progress | PRD auth routes and Better Auth email callbacks implemented | Verify SMTP credentials in target deployment | SMTP env required |
| 3 | User | Done | User management and role/status/delete endpoints implemented | Add admin dashboard summaries later | None |
| 4 | Profile | Done | Profile identity and media routes implemented | Add profile completeness later | None |
| 5 | Experience | Done | Experience CRUD implemented | Surface in post/profile UI later | None |
| 6 | Education | Done | Education CRUD implemented | Surface in profile UI later | None |
| 7 | Skill | Done | Skill add/list/delete implemented with normalized uniqueness | Add skill suggestions later | None |
| 8 | Post | In Progress | Post schema ready | Build create/feed/details | Auth/profile required |
| 9 | Comment | In Progress | Comment schema ready | Build comment CRUD | Post required |
| 10 | Reaction | In Progress | Reaction schema ready | Build reaction endpoints | Post/comment required |
| 11 | Vote | In Progress | Vote schema ready | Build vote endpoints | Post/comment required |
| 12 | Follow | Done | Follow/unfollow, follower/following lists, and suggestions implemented under `/users` | Add blocked-user and mutual-follow ranking later | None |
| 13 | Community | In Progress | Community schema ready | Build community CRUD | Auth required |
| 14 | Community Member | In Progress | Community member schema ready | Build join/leave/roles | Community required |
| 15 | Community Rule | In Progress | Community rule schema ready | Build rule CRUD | Community required |
| 16 | Bookmark | In Progress | Bookmark schema ready | Build bookmark endpoints | Post required |
| 17 | Notification | In Progress | Notification schema ready | Build notification helper | Engagement required |
| 18 | Report | In Progress | Report schema ready | Build report endpoints | Content/community required |
| 19 | Search | In Progress | Search entities ready for PostgreSQL basic search | Build basic search | Data required |
| 20 | Hashtag | In Progress | Hashtag schema ready | Build trending/tags | Post required |
| 21 | Upload | In Progress | Cloudinary storage helpers and MIME policies ready | Build upload endpoints | None |
| 22 | Admin | Not Started | Confirm dashboard metrics | Build admin dashboard API | Most modules required |

### Frontend Pages

| Page | Status | Current Task | Next Task | Blocker |
|---|---|---|---|---|
| Landing | Not Started | Define layout | Build hero/features/CTA | UI reference pending |
| Login | Not Started | Define form fields | Build UI | Auth strategy pending |
| Register | Not Started | Define form fields | Build UI | Auth strategy pending |
| Forgot Password | Not Started | Define flow | Build UI | Email setup pending |
| Reset Password | Not Started | Define flow | Build UI | Email setup pending |
| Feed | Not Started | Define 3-column layout | Build mock UI | UI reference pending |
| Public Profile | Not Started | Define sections | Build mock UI | Profile schema pending |
| Profile Settings | Not Started | Define fields | Build form UI | Profile schema pending |
| Post Details | Not Started | Define post/comment layout | Build mock UI | Post/comment schema pending |
| Communities | Not Started | Define browse layout | Build mock UI | Community schema pending |
| Create Community | Not Started | Define form fields | Build UI | Community schema pending |
| Community Details | Not Started | Define community layout | Build mock UI | Community schema pending |
| Bookmarks | Not Started | Define post list | Build UI | PostCard required |
| Notifications | Not Started | Define item states | Build UI | Notification schema pending |
| Search | Not Started | Define tabs | Build UI | Search route pending |
| Admin Dashboard | Not Started | Define metrics | Build UI | Admin API pending |
| Admin Users | Not Started | Define table columns | Build UI | User API pending |
| Admin Posts | Not Started | Define table columns | Build UI | Post API pending |
| Admin Communities | Not Started | Define table columns | Build UI | Community API pending |
| Admin Reports | Not Started | Define report flow | Build UI | Report API pending |

---

## Feature Acceptance Checklist

Before marking any feature as Done, verify:

- UI implemented
- Loading state implemented
- Empty state implemented
- Error state implemented
- API route implemented
- Validation implemented
- Authorization implemented
- Success and error messages implemented
- Query invalidation implemented where needed
- Mobile responsive behavior checked
- Progress tracker updated

---

## Recent Decisions

| Decision | Status | Notes |
|---|---|---|
| Nexora is separate from JobPilot | Final | No cross-project naming or logic |
| MVP is social-professional community platform | Final | LinkedIn + Reddit + X inspiration only |
| Core stack uses Next.js + Express + Prisma + PostgreSQL | Proposed | Can be finalized before coding |
| Cloudinary for media | Proposed | Recommended default |
| Redis and Socket.IO later | Proposed | Not required for MVP |
| Better Auth is auth provider | Final | Existing code uses Better Auth Prisma adapter |
| Prisma IDs use cuid | Final | Use `String @id @default(cuid())` consistently |
| API error shape uses `errorMessages` | Final | Matches PRD standard response contract |
| Cloudinary upload folders use Nexora names | Final | Old task/profile naming removed from upload helpers |

---

## Open Decisions

| Decision | Options | Recommendation | Needed Before |
|---|---|---|---|
| Repo structure | Monorepo / Separate repos | Monorepo if comfortable, separate repos if simpler | Setup |
| Feed pagination | Offset / Cursor | Offset for MVP, cursor later | Feed module |
| Search | PostgreSQL basic / Meilisearch | PostgreSQL basic first | Search module |

---

## Session Notes

Add notes here after each session.

### Session 1

- Created initial Nexora context files.
- Improved documents with deeper architecture, API routes, build plan, database ERD, library usage, and actionable tracker.

### Session 2

- Updated Better Auth Prisma schema for Nexora with user role, status, login metadata, soft-delete timestamp, and `User.profile` relation.
- Added a minimal `Profile` schema stub only to support the auth relation; full profile fields remain for the profile module.
- Created the remaining MVP Prisma schema files for profile details, posts, comments, communities, engagement, follows, bookmarks, hashtags, mentions, notifications, and reports.
- Ran `pnpm prisma format`, `pnpm prisma validate`, and `pnpm prisma generate` successfully for the full schema.
- Split polymorphic engagement targets into `PostReaction`, `CommentReaction`, `PostVote`, and `CommentVote` to prevent invalid empty or multi-target rows.
- Split mentions and reports into target-specific models to protect data integrity and moderation history.
- Added Better Auth account uniqueness on provider/account identity and changed key audit/content relations to restrict hard deletes.

### Session 3

- Updated `src/app/lib/auth.ts` to use env-backed Better Auth secret/base URL/trusted origins.
- Enabled email/password auth and exposed Nexora `role`, `status`, and `lastLoginAt` fields through Better Auth additional fields.
- Added hooks to normalize email, create the initial `Profile` row after user creation, block suspended/deleted users before session creation, and update `lastLoginAt` after login.

### Session 4

- Added PRD-aligned global error handling with `errorMessages`, sanitized Prisma/Zod helpers, and Cloudinary cleanup on failed upload requests.
- Added Nexora Cloudinary folders for post media, profile avatars, and profile covers, with temporary fallback support for old task/profile folder env names.
- Added `requireAuth` as the Better Auth session bridge and updated `validateRole` to use Nexora roles only.
- Mounted Better Auth, not-found middleware, and global error handling in the Express app.

### Session 5

- Split Prisma error handling into focused files for known request, validation, unknown, initialization, rust panic, and shared utility logic.
- Restored the PRD error response contract in uploaded Prisma/Zod helpers by returning `errorMessages` instead of `errorSources`.
- Added a shared `TErrorResponse` type for reusable error formatter outputs.
- Fixed Cloudinary folder env handling so new Nexora folder variables are optional with temporary old-name fallbacks.

### Session 6

- Reviewed all files under `src/app/shared` for Nexora PRD fit.
- Updated shared role/status constants to match `USER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN` and `ACTIVE`, `SUSPENDED`, `DELETED`.
- Added shared response types and fixed `sendResponse` to include `statusCode` in success payloads.
- Aligned shared upload constants with MVP media support and reused them from Cloudinary config.
- Hardened `QueryBuilder` so filtering and field selection require explicit allowlists.
- Improved `slugify` for safer profile/community slugs.

### Session 7

- Implemented the Auth module route/controller/service/validation/interface/utils files.
- Added all PRD auth endpoints under `/api/v1/auth`: register, login, logout, me, verify-email, forgot-password, reset-password, and change-password.
- Wrapped Better Auth email/password APIs while preserving Nexora response shape through `sendResponse`.
- Added private route protection with `requireAuth` for logout, me, and change-password.
- Noted remaining email delivery dependency for real verification and password reset emails.

### Session 8

- Hardened Nexora auth service using the stronger patterns from the Rik Dental Care service without copying dental-specific roles, statuses, OTP, phone, or Google login behavior.
- Added auth helpers for email normalization, request header conversion, Better Auth error parsing, and cookie forwarding.
- Added register/login guards for duplicate accounts, deleted accounts, suspended accounts, and inactive account status.
- Removed `as never` Better Auth endpoint casts from the auth module.

### Session 9

- Added `resendVerificationEmail`, `googleLogin`, and `googleLoginSuccess` to the Auth module.
- Added routes for `/api/v1/auth/resend-verification-email`, `/api/v1/auth/google`, and `/api/v1/auth/google/success`.
- Added optional Google OAuth env support through `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Configured Better Auth Google provider only when Google credentials are present.
- Kept email resend tied to Better Auth `sendVerificationEmail`, with live delivery still dependent on adding an email sender callback.

### Session 10

- Replaced the uploaded OTP email markup with an email-client-safe Nexora EJS template using inline styles and no scripts/CDN dependencies.
- Added a lazy SMTP email helper that does not verify connections during app import and returns clear service errors when SMTP envs are missing.
- Connected Better Auth email verification and password reset callbacks to the shared Nexora email template.
- Made SMTP and Google OAuth env groups optional at boot, while keeping actual email sending dependent on `MAIL_SMTP_*` values.
- Added the standard `ejs` runtime dependency and verified template rendering, Prisma schema validation, TypeScript compilation, and app import.

### Session 11

- Moved dotenv loading out of `env.ts` and into the server bootstrap entry.
- Updated env config to use typed `NODE_ENV`, numeric `PORT`, trimmed env reads, reusable string/number/boolean env helpers, and `IS_DEV`/`IS_PROD`/`IS_TEST` flags.
- Renamed config groups to `MAIL` and `OAUTH.GOOGLE`, with complete-or-absent validation for optional provider groups.
- Updated auth, email, and error-handler consumers to use the new config shape.

### Session 12

- Updated Express CORS to use the configured frontend origin with `credentials: true` for Better Auth cookies.
- Confirmed Better Auth uses origin-only `BETTER_AUTH_URL` and explicit `/api/auth` base path.
- Changed Better Auth email/password policy to require email verification and send verification emails on sign-up.
- Split `requireAuth` into its own middleware file and kept `validateRole` focused on role authorization.
- Cleaned reset-password payload forwarding so the token is only sent in the query and the body only contains the new password.
- Made forgot-password responses generic to avoid revealing whether an email exists.
- Left `/api/v1/auth/google/success` protected by `requireAuth`, with a live OAuth redirect/session-cookie test still required.

### Session 13

- Fixed the production build script by giving `tsup` an explicit `src/server.ts` entry.
- Added auth rate limiting for register, login, forgot-password, resend-verification, reset-password, and Google login routes.
- Refactored the Auth service to receive Better Auth `Headers` instead of Express `Request` objects.
- Restricted verification, password reset, and Google OAuth callback URLs to the configured frontend origin.
- Made resend-verification responses generic to avoid account-state enumeration.
- Removed old task/profile upload aliases and remaining local `any` casts from touched middleware/helpers.
- Aligned local mail env names to `MAIL_SMTP_*`; mail config is required in production and optional when fully absent in development.
- Added optional `SHADOW_DATABASE_URL` support in Prisma config for migration drift checks.
- Verified `pnpm tsc --noEmit`, `pnpm prisma validate`, `pnpm build`, and app import.

### Session 14

- Implemented the User module under `/api/v1/users` with route/controller/service/validation/interface/constant/utils files.
- Split account/admin user management into `user.service.ts` and follow behavior into `follow.service.ts`.
- Added admin user listing with search by name/email/profile username, role/status filters, sorting, pagination, and deleted-user exclusion unless explicitly filtered.
- Added role-aware user detail responses with public-safe mapping for normal users and admin-safe mapping for admins, while keeping deleted users as `404`.
- Added role updates, status updates, and soft delete with self-action blocks, transition rules, and session cleanup transactions.
- Added follow/unfollow, public followers/following lists, and follow suggestions with active/non-deleted/profile-present filtering.
- Added stable public/admin user mappers with computed avatar priority from `profile.avatar ?? user.image`.
- Mounted the module in the main API router and fixed the build script to use the explicit `src/server.ts` tsup entry.
- Hardened follow idempotency, strict public pagination validation, active-user count filtering, relation-filtered suggestions, and explicit admin user selection after review.
- Verified `pnpm tsc --noEmit`, `pnpm prisma validate`, and `pnpm build`.

### Session 15

- Implemented the Profile module with `/api/v1/profiles` identity/media routes and `/api/v1/profile` professional-detail routes.
- Added profile, profile media, experience, education, and skill services with owner-scoped mutations.
- Added deterministic username generation reuse between auth and profile auto-creation.
- Added strict date-only helpers for experience and education dates.
- Added `Skill.normalizedName` with a manually reviewed phased migration for duplicate cleanup.
- Added Cloudinary profile media cleanup that preserves the original database error on failure.
- Updated architecture, build plan, library docs, and progress tracker for the profile module.

---

## Next Session Plan

1. Build post media upload routes
2. Start protected feed/post routes
3. Build comment/reaction/vote routes
4. Build admin dashboard/report moderation endpoints after core content routes
5. Verify `MAIL_SMTP_*` credentials against the target mail provider when available
