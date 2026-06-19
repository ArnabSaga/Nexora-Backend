# Nexora UI Rules

## Design Direction

Nexora should feel like a premium social-professional platform. It should not look like a plain corporate admin dashboard. The experience should feel clean, credible, modern, social, and community-driven.

## Visual Personality

| Attribute | Direction |
|---|---|
| Tone | Professional, calm, smart, trustworthy |
| Layout | Feed-first, spacious, highly readable |
| Corners | Soft rounded corners |
| Color | Deep indigo, violet, cyan, neutral surfaces |
| Motion | Subtle and purposeful |
| Density | Medium, not cramped |
| Content feel | Social but not noisy |

---

## Layout Rules

### Main App Layout

Use a top navbar plus optional sidebars.

| Area | Purpose |
|---|---|
| Top Navbar | Logo, global search, create post, notifications, profile menu |
| Left Sidebar | Feed, communities, bookmarks, profile, settings shortcuts |
| Center Column | Primary content, feed, post details |
| Right Sidebar | Trending hashtags, suggested users, suggested communities |

### Desktop Feed Grid

Use this general structure:

```txt
Left Sidebar     Center Feed       Right Sidebar
260px            640px flexible    320px
```

### Mobile Layout

- Collapse sidebars
- Keep feed as single column
- Move primary navigation to top or bottom compact nav
- Composer should remain easy to open

---

## Typography Rules

- Use Inter as the default font
- Avoid too many font sizes
- Make content text readable before decorative
- Metadata should be small and muted
- Post content should have comfortable line height
- Page titles should be strong but not oversized

---

## Component Rules

### Cards

Use cards for:

- Posts
- Composer
- Community previews
- Profile sections
- Notifications
- Admin metrics
- Settings panels

Rules:

- Use white or soft surface background
- Use subtle border
- Use rounded corners
- Use light shadow only when needed
- Do not overuse colored backgrounds

### Buttons

Primary buttons:

- Create post
- Follow
- Join community
- Save profile
- Submit report

Secondary buttons:

- Cancel
- Edit
- View details
- Learn more

Danger buttons:

- Delete post
- Remove member
- Suspend user
- Confirm harmful moderation action

### Badges

Use badges for:

- Role
- Community role
- Post type
- Visibility
- Trending hashtag
- Report status
- Verification status

### Avatars

- Always show initials fallback
- Use consistent sizes
- Use status rings only where useful
- Profile avatar should be visually stronger than feed avatar

---

## Feed Rules

A post card must show:

- Author avatar
- Author name
- Username or headline
- Timestamp
- Optional community name
- Post type/visibility when useful
- Content
- Media preview
- Hashtags
- Reaction summary
- Comment count
- Vote score when applicable
- Bookmark action
- More menu

Post cards should be readable and not overloaded. Hide advanced metadata in menus when possible.

---

## Composer Rules

Post composer must support:

- Text input
- Post type selection
- Visibility selection
- Community selection when posting to a community
- Media upload
- Submit loading state
- Validation error state

Composer should feel quick like X but structured like a professional platform.

---

## Comment Rules

A comment item must show:

- Author avatar
- Author name
- Timestamp
- Content
- Reaction action
- Reply action
- Nested replies
- Edit/delete for owner
- Moderator delete when applicable

Nested replies should be indented but not too deep visually.

---

## Community Rules

Community card must show:

- Community avatar
- Name
- Slug
- Description
- Member count
- Visibility
- Join or View button

Community details page must show:

- Cover image
- Avatar
- Name and slug
- Description
- Member count
- Rules
- Join/leave button
- Community post feed

---

## Profile Rules

Public profile must show:

- Cover photo
- Avatar
- Name
- Username
- Headline
- Location
- Website
- Follow button
- Bio
- Experience
- Education
- Skills
- User posts

Profile settings must separate:

- Basic info
- Professional info
- Experience
- Education
- Skills
- Media uploads

---

## Admin UI Rules

Admin screens should be dense but clear.

Admin tables must include:

- Search
- Filters
- Status badges
- Pagination
- Row actions
- Confirm dialogs for destructive actions

Admin dashboards should use metric cards and simple charts later.

---

## State Rules

Every list page must include:

- Loading state
- Empty state
- Error state
- Pagination or infinite scroll state

Every mutation must include:

- Loading indicator
- Disabled submit state
- Success toast/message
- Error toast/message

---

## Accessibility Rules

- Buttons must have clear labels
- Icon-only buttons must have accessible labels
- Dialogs must have titles
- Forms must have labels
- Error messages must be close to fields
- Keyboard navigation should work for menus and dialogs

---

## Design Reference Images

Design references should be added later inside:

```txt
context/designs/
├── landing-page.png
├── feed-page.png
├── post-details.png
├── profile-page.png
├── community-page.png
├── admin-dashboard.png
└── mobile-feed.png
```

When images are added, update this file with notes describing which UI patterns should be followed.
