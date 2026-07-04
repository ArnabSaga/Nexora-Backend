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
| Current Focus | Harden MVP Prisma schema after production review |
| Overall MVP Status | Not Started |
| Frontend Status | Not Started |
| Backend Status | In Progress |
| Database Status | MVP schema implemented and Prisma-validated |
| API Status | Route contract draft ready |
| UI System Status | Tokens/rules/registry drafted |
| Last Updated | 2026-07-04 |

---

## Current Task

| Item | Details |
|---|---|
| Task | Resolve production review issues in MVP Prisma schema |
| Owner | Developer |
| Status | Review |
| Expected Output | Safer domain schema with target-specific engagement, mention, and report models |
| Acceptance Criteria | Prisma format, validate, and generate pass after production-risk fixes |

---

## Next Task

| Priority | Task | Type | Dependency |
|---|---|---|---|
| 1 | Create final PRD.md from improved context | Documentation | Context files |
| 2 | Create final Prisma schema from ERD | Backend | Database decision |
| 3 | Setup backend app | Backend | Repo setup |
| 4 | Setup frontend app | Frontend | Repo setup |
| 5 | Build auth UI and auth API | Full-stack | Backend/frontend setup |

---

## Active Blockers

| Blocker | Impact | Resolution Plan | Status |
|---|---|---|---|
| Final auth strategy not selected | Affects backend auth implementation | Decide between JWT and Better Auth before coding auth module | Open |
| Repository structure not finalized | Affects setup commands and imports | Choose monorepo or separate frontend/backend repos | Open |
| UI mock/reference images not added yet | Affects exact visual styling | Add design reference images later under `context/designs/` | Open |
| Storage provider not confirmed | Affects upload module | Use Cloudinary by default unless changed | Open |

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
| 1 | Foundation | In Progress | Prisma schema validated | Add shared helpers | None |
| 2 | Auth | In Progress | Better Auth schema aligned with PRD | Build register/login | None |
| 3 | User | In Progress | User role/status schema ready | Build list/update role/status | Auth required |
| 4 | Profile | In Progress | Profile schema ready | Build profile CRUD | Auth required |
| 5 | Experience | In Progress | Experience schema ready | Build CRUD | Profile required |
| 6 | Education | In Progress | Education schema ready | Build CRUD | Profile required |
| 7 | Skill | In Progress | Skill schema ready | Build add/delete | Profile required |
| 8 | Post | In Progress | Post schema ready | Build create/feed/details | Auth/profile required |
| 9 | Comment | In Progress | Comment schema ready | Build comment CRUD | Post required |
| 10 | Reaction | In Progress | Reaction schema ready | Build reaction endpoints | Post/comment required |
| 11 | Vote | In Progress | Vote schema ready | Build vote endpoints | Post/comment required |
| 12 | Follow | In Progress | Follow schema ready | Build follow/unfollow | User required |
| 13 | Community | In Progress | Community schema ready | Build community CRUD | Auth required |
| 14 | Community Member | In Progress | Community member schema ready | Build join/leave/roles | Community required |
| 15 | Community Rule | In Progress | Community rule schema ready | Build rule CRUD | Community required |
| 16 | Bookmark | In Progress | Bookmark schema ready | Build bookmark endpoints | Post required |
| 17 | Notification | In Progress | Notification schema ready | Build notification helper | Engagement required |
| 18 | Report | In Progress | Report schema ready | Build report endpoints | Content/community required |
| 19 | Search | In Progress | Search entities ready for PostgreSQL basic search | Build basic search | Data required |
| 20 | Hashtag | In Progress | Hashtag schema ready | Build trending/tags | Post required |
| 21 | Upload | Not Started | Confirm Cloudinary config | Build upload endpoints | Storage decision |
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

---

## Open Decisions

| Decision | Options | Recommendation | Needed Before |
|---|---|---|---|
| Auth strategy | JWT / Better Auth | JWT for learning and backend control, Better Auth for faster auth | Auth module |
| Repo structure | Monorepo / Separate repos | Monorepo if comfortable, separate repos if simpler | Setup |
| File upload | Cloudinary / S3 | Cloudinary for MVP | Upload module |
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

---

## Next Session Plan

1. Decide auth strategy
2. Decide repository structure
3. Generate Prisma schema from ERD
4. Generate backend foundation files
5. Start Auth module
