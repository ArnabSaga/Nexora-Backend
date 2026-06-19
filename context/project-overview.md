# Nexora Project Overview

## Product Identity

**Nexora** is a social-professional community platform that blends:

- LinkedIn-style professional identity
- Reddit-style communities and discussion threads
- X-style fast short posts, reposts, trends, and real-time expression

Nexora must remain its own product. Do not mix this project with JobPilot, MediStore, or any other platform.

## One-Line Vision

Nexora is where professionals, creators, builders, and communities share ideas, discuss topics, build reputation, and grow their network.

## Tagline

**Where professionals share, discuss, and grow.**

## Product Positioning

Nexora is not a clone of LinkedIn, Reddit, or X. It is a professional community discussion network where users can build credibility through public identity, thoughtful posts, community participation, and high-quality engagement.

## Core User Promise

Nexora helps users:

1. Create a credible professional profile
2. Share short posts, insights, discussions, and updates
3. Follow people and build a meaningful network
4. Join communities around industries, interests, and knowledge areas
5. Participate in discussions through comments, replies, reactions, votes, and reposts
6. Save important posts
7. Discover trends, hashtags, users, and communities
8. Report harmful content and maintain a safer platform

## Target Users

| User Type | Description | Main Need |
|---|---|---|
| Guest | Visitor without account | Explore public content, view profiles, register/login |
| User | Normal registered user | Post, follow, comment, react, vote, bookmark, join communities |
| Professional | User with career identity | Showcase experience, skills, education, credibility |
| Community Creator | User who creates topic spaces | Build and manage community around a niche |
| Moderator | Community-level safety manager | Review reports, manage posts, members, and rules |
| Admin | Platform operator | Manage users, posts, reports, communities, and platform health |
| Super Admin | System owner | Full access to roles, moderation, and platform-level settings |

## MVP Goal

The MVP should prove the core social engine:

- Authentication works
- Profiles work
- Posts work
- Feed works
- Comments work
- Reactions and votes work
- Follow system works
- Communities work
- Bookmark system works
- Notifications work
- Reports and admin moderation work

## MVP Modules

| Priority | Module | Purpose |
|---|---|---|
| 1 | Auth | Account access and identity |
| 2 | User | User role/status management |
| 3 | Profile | Public professional identity |
| 4 | Post | Core content engine |
| 5 | Comment | Discussion engine |
| 6 | Reaction | LinkedIn/X-style engagement |
| 7 | Vote | Reddit-style ranking signal |
| 8 | Follow | Social graph |
| 9 | Community | Topic-based discussion spaces |
| 10 | Bookmark | Save content |
| 11 | Notification | User activity updates |
| 12 | Report | Safety and abuse reporting |
| 13 | Search | Discover users, posts, communities, hashtags |
| 14 | Admin | Platform management |

## Non-MVP / Later Features

| Feature | Version | Reason |
|---|---|---|
| Direct messaging | v2 | Requires conversation and realtime logic |
| Realtime notification | v2 | Requires Socket.IO or similar |
| Polls | v2 | Can be built after basic post engine |
| Company pages | v2 | LinkedIn-style professional expansion |
| Recommendation engine | v2/v3 | Needs real user behavior data |
| AI post assistant | v3 | Advanced creator feature |
| AI thread summary | v3 | Works best after long discussion data exists |
| Job board | v3 | Separate monetization/product module |
| Premium subscription | v3 | Requires stable retention and value proposition |
| Mobile app | v3 | Build after web MVP is stable |

## Core Pages

| Page | Route | Purpose |
|---|---|---|
| Landing | `/` | Explain Nexora and convert visitors |
| Register | `/register` | User signup |
| Login | `/login` | User login |
| Forgot Password | `/forgot-password` | Password reset request |
| Reset Password | `/reset-password` | Password reset using token |
| Feed | `/feed` | Personalized feed |
| Public Profile | `/profile/[username]` | Public identity page |
| Profile Settings | `/settings/profile` | Edit profile, skills, education, experience |
| Account Settings | `/settings/account` | Password, email, account settings |
| Post Details | `/posts/[id]` | Single post with comments |
| Communities | `/communities` | Browse/search communities |
| Create Community | `/communities/create` | Create a new community |
| Community Details | `/communities/[slug]` | Community profile and posts |
| Bookmarks | `/bookmarks` | Saved posts |
| Notifications | `/notifications` | Activity inbox |
| Search | `/search` | Global search |
| Admin Dashboard | `/admin` | Platform stats |
| Admin Users | `/admin/users` | User management |
| Admin Posts | `/admin/posts` | Post moderation |
| Admin Communities | `/admin/communities` | Community moderation |
| Admin Reports | `/admin/reports` | Report review |

## Core User Flow

### Guest Flow

1. Visit landing page
2. Browse public feed or public profiles if enabled
3. Search public content
4. Register or login
5. Redirect to feed after authentication

### User Flow

1. Register/login
2. Complete profile
3. Follow users
4. Join communities
5. Create posts
6. Comment, react, vote, bookmark
7. Receive notifications
8. Report harmful content when needed

### Community Creator Flow

1. Create community
2. Add description, avatar, cover, rules
3. Invite/join members
4. Publish community posts
5. Assign moderators
6. Manage reports and members

### Admin Flow

1. View dashboard metrics
2. Review users, posts, communities, reports
3. Suspend harmful users or communities
4. Delete harmful posts/comments
5. Resolve reports

## Product Principles

1. **Feed-first**: posting and reading content must feel fast and natural.
2. **Identity matters**: every action should connect to a meaningful profile.
3. **Communities create depth**: topic spaces should feel organized, not noisy.
4. **Moderation is core**: reporting and admin tools are not optional.
5. **Build small, ship clean**: avoid advanced AI/realtime features until the base engine works.
6. **Never mix contexts**: Nexora docs, naming, UI, and routes must stay Nexora-specific.

## Success Criteria for MVP

Nexora MVP is successful when:

- User can register and login
- User can complete profile
- User can create, edit, delete, and view posts
- User can follow/unfollow other users
- User can view personalized feed
- User can comment and reply
- User can react and vote
- User can create and join communities
- User can bookmark posts
- User can receive notifications
- User can report content
- Admin can manage users, posts, communities, and reports
