# Nexora Progress Tracker

## How to Use This File

Update this file after every development session. This is the single source of truth for current progress, next task, blockers, completed modules, and open decisions.

---

## Project Status Snapshot

| Field | Current Value |
|---|---|
| Project | Nexora |
| Product Type | Social-professional community platform |
| Current Phase | Phase 0 — Planning and Context Finalization |
| Current Focus | Improve Nexora project context files and prepare build-ready documentation |
| Overall MVP Status | Not Started |
| Frontend Status | Not Started |
| Backend Status | Not Started |
| Database Status | Draft ERD ready |
| API Status | Route contract draft ready |
| UI System Status | Tokens/rules/registry drafted |
| Last Updated | Update manually after each session |

---

## Current Task

| Item | Details |
|---|---|
| Task | Finalize Nexora context documentation |
| Owner | Developer |
| Status | In Progress |
| Expected Output | Complete context folder with architecture, build plan, standards, library docs, UI rules, tokens, registry, overview, and tracker |
| Acceptance Criteria | All files are Nexora-specific, deeper than initial version, and do not include JobPilot context |

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
| 1 | Foundation | Not Started | Setup Express + TypeScript | Add shared helpers | Repo not created |
| 2 | Auth | Not Started | Select auth strategy | Build register/login | Auth strategy open |
| 3 | User | Not Started | Define admin user flow | Build list/update role/status | Auth required |
| 4 | Profile | Not Started | Finalize profile schema | Build profile CRUD | Auth required |
| 5 | Experience | Not Started | Confirm fields | Build CRUD | Profile required |
| 6 | Education | Not Started | Confirm fields | Build CRUD | Profile required |
| 7 | Skill | Not Started | Confirm skill model | Build add/delete | Profile required |
| 8 | Post | Not Started | Finalize post schema | Build create/feed/details | Auth/profile required |
| 9 | Comment | Not Started | Confirm nested replies | Build comment CRUD | Post required |
| 10 | Reaction | Not Started | Confirm reaction types | Build reaction endpoints | Post/comment required |
| 11 | Vote | Not Started | Confirm vote behavior | Build vote endpoints | Post/comment required |
| 12 | Follow | Not Started | Confirm self-follow rule | Build follow/unfollow | User required |
| 13 | Community | Not Started | Confirm visibility rules | Build community CRUD | Auth required |
| 14 | Community Member | Not Started | Confirm role permissions | Build join/leave/roles | Community required |
| 15 | Community Rule | Not Started | Confirm moderation scope | Build rule CRUD | Community required |
| 16 | Bookmark | Not Started | Confirm save behavior | Build bookmark endpoints | Post required |
| 17 | Notification | Not Started | Define event triggers | Build notification helper | Engagement required |
| 18 | Report | Not Started | Confirm report targets | Build report endpoints | Content/community required |
| 19 | Search | Not Started | Select search strategy | Build basic search | Data required |
| 20 | Hashtag | Not Started | Confirm extraction logic | Build trending/tags | Post required |
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

---

## Next Session Plan

1. Decide auth strategy
2. Decide repository structure
3. Generate Prisma schema from ERD
4. Generate backend foundation files
5. Start Auth module
