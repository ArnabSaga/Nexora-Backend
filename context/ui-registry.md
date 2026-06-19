# Nexora UI Registry

## Purpose

This is a living registry of Nexora UI components. Before building any new component, check this file first. Reuse existing patterns before creating new ones.

After building any component, update this file with the component path, purpose, status, and important styling/behavior notes.

---

## Status Legend

| Status | Meaning |
|---|---|
| Planned | Not built yet |
| In Progress | Currently being built |
| Review | Built but needs review |
| Done | Ready and reusable |

---

## Layout Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| AppShell | `components/layout/AppShell.tsx` | Main authenticated app layout | Planned | Top navbar + optional sidebars |
| Navbar | `components/layout/Navbar.tsx` | Main navigation | Planned | Logo, search, create, notifications, profile |
| LeftSidebar | `components/layout/LeftSidebar.tsx` | Main app navigation shortcuts | Planned | Feed, communities, bookmarks, profile |
| RightSidebar | `components/layout/RightSidebar.tsx` | Trends and suggestions | Planned | Trending hashtags, suggested users/communities |
| MobileNav | `components/layout/MobileNav.tsx` | Mobile navigation | Planned | Compact bottom/top nav |

---

## Auth Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| LoginForm | `components/auth/LoginForm.tsx` | User login | Planned | Email/password, loading/error |
| RegisterForm | `components/auth/RegisterForm.tsx` | User registration | Planned | Name/email/password |
| ForgotPasswordForm | `components/auth/ForgotPasswordForm.tsx` | Password reset request | Planned | Email only |
| ResetPasswordForm | `components/auth/ResetPasswordForm.tsx` | Reset password | Planned | Token based |
| AuthGuard | `components/auth/AuthGuard.tsx` | Protect client-rendered sections | Planned | Use with route protection if needed |

---

## Feed and Post Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| FeedPage | `components/feed/FeedPage.tsx` | Main feed composition | Planned | Includes composer and feed list |
| FeedList | `components/feed/FeedList.tsx` | Render list of posts | Planned | Loading/empty/error states |
| FeedFilter | `components/feed/FeedFilter.tsx` | Feed type selector | Planned | Following, community, trending |
| PostCard | `components/post/PostCard.tsx` | Reusable post preview | Planned | Core social card |
| PostComposer | `components/post/PostComposer.tsx` | Create post UI | Planned | Text, media, visibility, community |
| PostMediaGrid | `components/post/PostMediaGrid.tsx` | Media preview in post | Planned | Images/files preview |
| PostActionMenu | `components/post/PostActionMenu.tsx` | Edit/delete/report menu | Planned | Permission aware |
| RepostComposer | `components/post/RepostComposer.tsx` | Repost with comment | Planned | Linked original post |
| PostTypeBadge | `components/post/PostTypeBadge.tsx` | Show post type | Planned | Professional, short, discussion, poll |

---

## Comment Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| CommentList | `components/comment/CommentList.tsx` | Render post comments | Planned | Supports pagination |
| CommentItem | `components/comment/CommentItem.tsx` | Single comment/reply | Planned | Nested replies |
| CommentComposer | `components/comment/CommentComposer.tsx` | Add comment/reply | Planned | Used in post details |
| ReplyThread | `components/comment/ReplyThread.tsx` | Nested reply list | Planned | Limit depth visually |

---

## Engagement Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| ReactionBar | `components/engagement/ReactionBar.tsx` | Post/comment reactions | Planned | Like/love/insightful/celebrate/funny |
| ReactionPicker | `components/engagement/ReactionPicker.tsx` | Select reaction | Planned | Popover or quick buttons |
| VoteControl | `components/engagement/VoteControl.tsx` | Upvote/downvote | Planned | For posts/comments |
| BookmarkButton | `components/engagement/BookmarkButton.tsx` | Save/unsave post | Planned | Used in PostCard |
| FollowButton | `components/engagement/FollowButton.tsx` | Follow/unfollow user | Planned | Used in profile/user cards |

---

## Community Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| CommunityCard | `components/community/CommunityCard.tsx` | Community preview | Planned | Browse/search |
| CommunityHeader | `components/community/CommunityHeader.tsx` | Community details header | Planned | Avatar, cover, join button |
| CommunityRules | `components/community/CommunityRules.tsx` | Display rules | Planned | Details page/sidebar |
| CommunityMemberTable | `components/community/CommunityMemberTable.tsx` | Manage members | Planned | Owner/admin/moderator |
| CreateCommunityForm | `components/community/CreateCommunityForm.tsx` | Create community | Planned | Name, slug, description, visibility |
| CommunitySettingsForm | `components/community/CommunitySettingsForm.tsx` | Update community | Planned | Owner/admin only |

---

## Profile Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| ProfileHeader | `components/profile/ProfileHeader.tsx` | Public profile hero | Planned | Cover, avatar, headline, follow |
| ProfileAbout | `components/profile/ProfileAbout.tsx` | Bio/about | Planned | Public profile |
| ExperienceList | `components/profile/ExperienceList.tsx` | Experience display | Planned | Public/settings |
| ExperienceForm | `components/profile/ExperienceForm.tsx` | Add/edit experience | Planned | Dialog or inline |
| EducationList | `components/profile/EducationList.tsx` | Education display | Planned | Public/settings |
| EducationForm | `components/profile/EducationForm.tsx` | Add/edit education | Planned | Dialog or inline |
| SkillTags | `components/profile/SkillTags.tsx` | Skill display | Planned | Public/settings |
| ProfileSettingsForm | `components/profile/ProfileSettingsForm.tsx` | Main profile edit | Planned | Profile details |
| AvatarUploader | `components/profile/AvatarUploader.tsx` | Avatar upload | Planned | Cloudinary upload |
| CoverUploader | `components/profile/CoverUploader.tsx` | Cover upload | Planned | Cloudinary upload |

---

## Notification and Report Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| NotificationItem | `components/notification/NotificationItem.tsx` | Single notification | Planned | Read/unread state |
| NotificationList | `components/notification/NotificationList.tsx` | Notifications page | Planned | Loading/empty/error |
| NotificationDropdown | `components/notification/NotificationDropdown.tsx` | Navbar dropdown | Planned | Later enhancement |
| ReportDialog | `components/report/ReportDialog.tsx` | Report content | Planned | Target-aware |
| ReportReasonSelect | `components/report/ReportReasonSelect.tsx` | Select reason | Planned | Reusable in report dialog |

---

## Admin Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| AdminStatCard | `components/admin/AdminStatCard.tsx` | Dashboard metric | Planned | Users/posts/reports |
| AdminUserTable | `components/admin/AdminUserTable.tsx` | Manage users | Planned | Search/filter/actions |
| AdminPostTable | `components/admin/AdminPostTable.tsx` | Manage posts | Planned | Delete/moderate |
| AdminCommunityTable | `components/admin/AdminCommunityTable.tsx` | Manage communities | Planned | Suspend/manage |
| AdminReportTable | `components/admin/AdminReportTable.tsx` | Manage reports | Planned | Status and actions |
| AdminActionDialog | `components/admin/AdminActionDialog.tsx` | Confirm admin action | Planned | Destructive confirmation |

---

## Shared Components

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| EmptyState | `components/shared/EmptyState.tsx` | Empty UI state | Planned | Reusable |
| ErrorState | `components/shared/ErrorState.tsx` | Error UI state | Planned | Reusable |
| LoadingSkeleton | `components/shared/LoadingSkeleton.tsx` | Loading UI | Planned | Reusable |
| PageHeader | `components/shared/PageHeader.tsx` | Page title/subtitle/actions | Planned | Reusable |
| ConfirmDialog | `components/shared/ConfirmDialog.tsx` | Destructive confirmation | Planned | Reusable |
| PaginationControls | `components/shared/PaginationControls.tsx` | Page navigation | Planned | Reusable |
| UserAvatar | `components/shared/UserAvatar.tsx` | Avatar with fallback | Planned | Reusable |
| StatusBadge | `components/shared/StatusBadge.tsx` | Status display | Planned | Role/report/user statuses |

---

## Registry Update Template

When a component is built, update it like this:

| Component | Path | Purpose | Status | Notes |
|---|---|---|---|---|
| ComponentName | `components/path/ComponentName.tsx` | What it does | Done | Important style/behavior notes |

## Rule

Do not create duplicate UI patterns unless the use case is clearly different. Prefer extending existing components with props.
