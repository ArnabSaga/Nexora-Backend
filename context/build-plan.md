# Nexora Build Plan

## Build Principle

Build Nexora feature-by-feature with **UI first, then logic**. Every feature must have visible UI, loading state, empty state, error state, API integration, validation, authorization, and acceptance checks before moving on.

Do not build invisible backend-only phases for too long. The user should be able to see and test every feature as soon as possible.

---

## Status Legend

| Status | Meaning |
|---|---|
| Not Started | No work done yet |
| In Progress | Currently being built |
| Blocked | Cannot continue due to dependency or issue |
| Review | Built but needs review/testing |
| Done | Fully tested and accepted |

---

## Phase 0 — Project Setup and Planning

### Goal

Prepare Nexora-specific documentation, repository structure, development environment, and architecture decisions.

### Deliverables

| Deliverable | Status |
|---|---|
| project-overview.md | Done |
| architecture.md | Done |
| build-plan.md | Done |
| code-standards.md | Done |
| library-docs.md | Done |
| progress-tracker.md | Done |
| ui-registry.md | Done |
| ui-rules.md | Done |
| ui-tokens.md | Done |
| PRD.md | Done |
| ERD diagram | Drafted |
| Use case diagram | Drafted |

### Acceptance Criteria

- No JobPilot naming exists in Nexora files
- Nexora has its own context files
- MVP scope is clearly defined
- API and database direction is documented

---

## Phase 1 — Foundation

### 1.1 Repository Setup

**UI Work**

- Create Next.js frontend app
- Add landing page placeholder
- Add basic app shell placeholder
- Add global styles and theme tokens

**Backend Logic Work**

- Create Express backend app
- Add TypeScript config
- Add environment config
- Add health route
- Add global error handler
- Add not-found handler

**Acceptance Criteria**

- Frontend runs locally
- Backend runs locally
- `/api/v1/health` returns success
- Code follows folder structure from architecture.md

### 1.2 Database Setup

**UI Work**

- No production UI yet
- Add developer-only database status note if needed

**Backend Logic Work**

- Setup PostgreSQL
- Setup Prisma
- Create base schema
- Add database connection helper
- Add seed script for admin user

**Acceptance Criteria**

- Prisma can connect to database
- Migration runs successfully
- Seed creates initial admin user

### 1.3 Shared Backend Helpers

**UI Work**

- None

**Backend Logic Work**

- Create `catchAsync`
- Create `sendResponse`
- Create `AppError`
- Create `validateRequest`
- Create `paginationHelper`
- Create `queryBuilder`
- Create `pick`
- Create `generateSlug`

**Acceptance Criteria**

- All backend modules can reuse shared helpers
- Error and success responses are consistent

---

## Phase 2 — Authentication and User

### 2.1 Register and Login

**UI Work**

- Register page
- Login page
- Form fields with validation messages
- Loading state on submit
- Error message for invalid credentials
- Success redirect to `/feed`

**Backend Logic Work**

- Register endpoint
- Login endpoint
- Password hashing
- Token/session generation
- Current user endpoint
- Logout endpoint

**Acceptance Criteria**

- New user can register
- Existing user can login
- Invalid login shows clear error
- Authenticated user can fetch own data

### 2.2 Email Verification and Password Reset

**UI Work**

- Verify email state page
- Forgot password page
- Reset password page
- Success/error states

**Backend Logic Work**

- Email verification token
- Forgot password token
- Reset password logic
- Email sending helper

**Acceptance Criteria**

- Verification link works
- Password reset link works
- Expired/invalid token returns clear error

### 2.3 User Admin Management

**UI Work**

- Admin users table
- User search/filter
- Role/status badges
- Role update action
- Suspend/activate action

**Backend Logic Work**

- List users
- Get user by ID
- Update role
- Update status
- Delete user
- Admin authorization middleware

**Acceptance Criteria**

- Admin can manage users
- Normal user cannot access admin endpoints

---

## Phase 3 — Profile System

Backend status: implemented for profile identity, media upload, experience, education, and skills.

### 3.1 Public Profile UI

**UI Work**

- Profile header with cover photo, avatar, name, username, headline
- Bio/about section
- Experience section
- Education section
- Skills section
- Follow button placeholder
- Empty states for missing profile sections

**Backend Logic Work**

- Public profile endpoint by username
- Profile data aggregation

**Acceptance Criteria**

- Public profile loads by username
- Missing sections show clean empty states

### 3.2 Profile Settings

**UI Work**

- Profile edit form
- Avatar upload
- Cover photo upload
- Bio/headline/profession/company fields
- Location and website fields
- Save button with loading state

**Backend Logic Work**

- Update own profile
- Validate username uniqueness
- Upload avatar
- Upload cover photo

**Acceptance Criteria**

- User can update own profile
- User cannot update another profile
- Duplicate username is blocked

### 3.3 Professional Details

**UI Work**

- Experience add/edit/delete UI
- Education add/edit/delete UI
- Skill add/delete UI
- Form validation and empty states

**Backend Logic Work**

- Experience CRUD
- Education CRUD
- Skill create/connect
- UserSkill relation

**Acceptance Criteria**

- User can manage own experience, education, and skills
- Public profile displays professional details

---

## Phase 4 — Post and Feed Engine

### 4.1 Post Composer

**UI Work**

- Post composer card
- Text area
- Post type selector
- Visibility selector
- Optional community selector
- Media upload area
- Hashtag and mention support placeholder
- Submit button

**Backend Logic Work**

- Create post endpoint
- Media upload handling
- Hashtag extraction
- Mention extraction
- Community validation

**Acceptance Criteria**

- User can create text post
- User can create post with media
- Hashtags are stored
- Mentions are stored

### 4.2 Feed Page

**UI Work**

- Three-column feed layout on desktop
- Center feed list
- Post cards
- Left navigation/sidebar
- Right trending/suggestions sidebar
- Loading skeleton
- Empty state
- Error state

**Backend Logic Work**

- Personalized feed endpoint
- Public feed endpoint
- Pagination
- Basic ranking logic

**Acceptance Criteria**

- Authenticated user sees feed
- Public feed works for guests if enabled
- Pagination works

### 4.3 Post Details

**UI Work**

- Single post page
- Post card full view
- Comment composer
- Comment thread
- Related community/profile links

**Backend Logic Work**

- Single post endpoint
- Permission checks for private/community posts

**Acceptance Criteria**

- User can open post details
- Community/private visibility is respected

### 4.4 Post Owner Actions

**UI Work**

- Edit post dialog
- Delete confirmation
- Repost composer

**Backend Logic Work**

- Update post
- Soft delete post
- Repost endpoint

**Acceptance Criteria**

- User can edit/delete own post only
- Admin can delete harmful post
- Repost creates linked post

---

## Phase 5 — Comments and Engagement

### 5.1 Comment System

**UI Work**

- Comment composer
- Comment item
- Reply composer
- Nested replies
- Edit/delete comment menu

**Backend Logic Work**

- Add comment
- Add reply
- Get comments
- Update comment
- Delete comment

**Acceptance Criteria**

- User can comment on post
- User can reply to comment
- Owner can edit/delete own comment

### 5.2 Reactions

**UI Work**

- Reaction bar
- Reaction picker
- Reaction count summary
- Active reaction state

**Backend Logic Work**

- React to post
- Remove post reaction
- React to comment
- Remove comment reaction
- Ensure one active reaction per user per target

**Acceptance Criteria**

- User can react once per post/comment
- Changing reaction updates correctly

### 5.3 Votes

**UI Work**

- Vote control
- Upvote/downvote buttons
- Vote score display
- Active vote state

**Backend Logic Work**

- Vote on post/comment
- Remove vote
- Ensure one active vote per user per target

**Acceptance Criteria**

- Vote score updates correctly
- User cannot duplicate vote

### 5.4 Bookmarks

**UI Work**

- Bookmark button on post card
- Bookmarks page
- Empty saved posts state

**Backend Logic Work**

- Bookmark post
- Remove bookmark
- Get own bookmarks

**Acceptance Criteria**

- User can save/unsave posts
- Bookmarks page shows saved posts

---

## Phase 6 — Follow and Community

### 6.1 Follow System

**UI Work**

- Follow button on profile and user card
- Followers/following modal or page
- Suggested users card

**Backend Logic Work**

- Follow user
- Unfollow user
- Followers list
- Following list
- Suggested users endpoint

**Acceptance Criteria**

- User can follow/unfollow
- User cannot follow self
- Feed prioritizes followed users

### 6.2 Community Browse and Details

**UI Work**

- Communities browse page
- Community card
- Community details page
- Community header
- Community post feed
- Join/leave button

**Backend Logic Work**

- Create community
- List communities
- Get community by slug
- Join community
- Leave community
- Get community posts

**Acceptance Criteria**

- User can create community
- User can join/leave community
- Community posts are visible according to visibility rules

### 6.3 Community Management

**UI Work**

- Community settings page or modal
- Member management table
- Role update action
- Remove member action
- Rule management section

**Backend Logic Work**

- Update community
- Delete community
- Get members
- Update member role
- Remove member
- Add/update/delete rules

**Acceptance Criteria**

- Owner can manage community
- Moderator can perform allowed moderation tasks
- Normal member cannot manage members/rules

---

## Phase 7 — Notification, Search, and Hashtags

### 7.1 Notifications

**UI Work**

- Notifications page
- Notification dropdown in navbar
- Unread badge
- Mark read action
- Empty notifications state

**Backend Logic Work**

- Create notification helper
- List notifications
- Mark one read
- Mark all read
- Delete notification

**Acceptance Criteria**

- User receives notification for follow, reaction, comment, reply, mention, repost
- User can mark notifications as read

### 7.2 Search

**UI Work**

- Global search page
- Search input
- Tabs for users/posts/communities/hashtags
- Search result cards
- Empty state

**Backend Logic Work**

- Global search endpoint
- Search users
- Search posts
- Search communities
- Search hashtags
- Pagination

**Acceptance Criteria**

- Search works across key entities
- Results are paginated

### 7.3 Hashtags

**UI Work**

- Trending hashtags widget
- Hashtag posts page/list

**Backend Logic Work**

- Extract hashtags from posts
- Track post count
- Trending hashtags endpoint
- Posts by hashtag endpoint

**Acceptance Criteria**

- Trending hashtags display
- Hashtag click opens related posts

---

## Phase 8 — Safety and Admin

### 8.1 Report System

**UI Work**

- Report dialog
- Report reason selector
- Submit report confirmation
- Admin report list
- Report details drawer/page

**Backend Logic Work**

- Create report
- Get all reports
- Get single report
- Update report status
- Validate report target

**Acceptance Criteria**

- User can report post/comment/user/community
- Admin can review and resolve reports

### 8.2 Admin Dashboard

**UI Work**

- Dashboard stat cards
- Recent reports list
- User growth placeholder chart
- Content volume placeholder chart

**Backend Logic Work**

- Dashboard stats endpoint
- Count users/posts/communities/reports
- Pending reports count

**Acceptance Criteria**

- Admin can see system overview
- Normal user cannot access admin dashboard

### 8.3 Admin Moderation

**UI Work**

- Admin users table
- Admin posts table
- Admin communities table
- Admin reports table
- Suspend/delete/resolve actions

**Backend Logic Work**

- Admin list posts
- Admin delete posts
- Admin list communities
- Admin suspend communities
- Admin resolve reports

**Acceptance Criteria**

- Admin can moderate platform content
- Actions are protected by role middleware

---

## Phase 9 — Polish and Release

### UI Polish

- Responsive mobile layout
- Better empty states
- Better skeleton loaders
- Toast messages
- Dialog confirmations
- Form validation messages
- Accessibility check

### Backend Polish

- Rate limiting
- Better logging
- Final error handling check
- Query optimization
- Indexes for search and feed
- Security review

### Release Criteria

- All MVP flows are tested
- All admin flows are tested
- No unrelated project references exist
- Documentation is updated
- Progress tracker reflects true status
