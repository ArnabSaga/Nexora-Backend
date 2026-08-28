# Nexora Product Requirement Document

## 1. Project Overview

### 1.1 Project Name

Nexora

### 1.2 Project Type

Social Media and Professional Community Platform

### 1.3 Product Vision

Nexora is a modern social media platform that combines the professional networking style of LinkedIn, the topic-based community discussion style of Reddit, and the short-form real-time posting style of X.

The platform will allow users to build professional identities, share posts, follow people, join communities, discuss topics, react to content, vote on community discussions, save posts, report inappropriate content, receive notifications, and discover relevant people and information.

In future versions, Nexora will introduce an AI Intelligence System that can help users create better content, summarize discussions, discover relevant knowledge, perform semantic search, receive intelligent recommendations, and interact with Nexora through a platform-aware AI assistant.

### 1.4 Tagline

Where professionals share, discuss, and grow.

### 1.5 Product Positioning

Nexora will be positioned as a professional community discussion platform where users can build credibility, share ideas, join meaningful conversations, discover relevant knowledge, and grow their personal or professional network.

In later versions, Nexora will become an AI-enhanced professional community platform without allowing AI to replace platform security, privacy, authorization, or moderation rules.

---

## 2. Product Objective

The main objective of Nexora is to create a scalable, secure, and engaging social platform where users can:

- Build a professional public identity
- Share thoughts, professional updates, articles, and discussions
- Follow other users and grow a network
- Join topic-based communities
- Participate in meaningful discussions
- React, comment, vote, repost, and bookmark content
- Discover trending posts, people, hashtags, and communities
- Search relevant users, posts, communities, and topics
- Report harmful or inappropriate content
- Receive notifications for important activities
- Allow admins and moderators to maintain platform safety
- Support intelligent content discovery in later phases
- Provide AI-assisted content creation and discussion understanding in future versions

---

## 3. Target Users

### 3.1 General Users

Users who want to share posts, follow others, join communities, and engage with content.

### 3.2 Professionals

Users who want to build a professional profile, showcase experience, skills, education, achievements, and industry identity.

### 3.3 Community Creators

Users who want to create and manage topic-based communities.

### 3.4 Community Moderators

Users responsible for maintaining community quality, enforcing rules, and moderating posts, comments, and members inside assigned communities.

### 3.5 Platform Moderators

Platform-level moderators who may support platform moderation according to explicitly assigned permissions.

### 3.6 Admins

Platform administrators who manage users, posts, reports, communities, and overall platform moderation.

### 3.7 Super Admins

System-level administrators with complete platform control.

---

## 4. User Roles and Permissions

| Role        | Description                | Key Permissions                                                    |
| ----------- | -------------------------- | ------------------------------------------------------------------ |
| User        | Default platform member    | Create posts, comment, react, vote, follow users, join communities |
| Moderator   | Platform moderation role   | Review Reports through the existing Report workflow                |
| Admin       | Platform-level manager     | Manage users, posts, communities, reports, and moderation          |
| Super Admin | Full system owner          | Full access to all platform-level controls                         |

Community roles are managed separately from platform roles.

A platform Moderator does not automatically receive permission to moderate every community.

Platform and Community roles are independent and additive. In the MVP, a
platform Moderator may list, inspect, and transition Reports but receives no
global content-deletion, Community-suspension, User-management, or Admin-panel
authority. Community moderation instead applies when the requester owns an
available Community or has an ACTIVE OWNER, ADMIN, or MODERATOR membership in
that Community. Community ownership does not require a matching membership row.

| Platform role | Community role | Report review | Global moderation | Scoped Community moderation | Admin/User APIs |
| ------------- | -------------- | ------------: | ----------------: | ---------------------------: | --------------: |
| USER          | MEMBER         |            No |                No |                           No |              No |
| USER          | MODERATOR      |            No |                No |    Active assigned Community |              No |
| MODERATOR     | MEMBER         |           Yes |                No |                           No |              No |
| MODERATOR     | MODERATOR      |           Yes |                No |    Active assigned Community |              No |
| ADMIN         | MEMBER         |           Yes |               Yes | Global authority where supported |         Yes |
| SUPER_ADMIN   | MEMBER         |           Yes |               Yes | Global authority where supported |         Yes |

---

## 5. MVP Scope

The first version of Nexora should focus on the core social, professional, community, engagement, search, and moderation features.

### 5.1 MVP Modules

| Module                       | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| Authentication               | Register, login, logout, email verification, password management |
| User Management              | Manage user account, role, and status                            |
| Profile Management           | Public user profile with professional identity                   |
| Professional Profile System  | Experience, education, and skills                                |
| Follow System                | Follow and unfollow users                                        |
| Community System             | Create, join, leave, and manage communities                      |
| Community Rule Management    | Manage community guidelines                                     |
| Post Management              | Create, update, delete, view, and repost content                 |
| Comment Management           | Comment and one-level reply system                               |
| Reaction System              | Like, love, insightful, celebrate, and funny reactions           |
| Voting System                | Upvote and downvote discussion-based content                     |
| Bookmark System              | Save posts for later                                             |
| Notification System          | Notify users about engagement and activity                       |
| Report System                | Report harmful content or users                                  |
| Search System                | Search users, posts, communities, and hashtags                   |
| Hashtag System               | Hashtag discovery and trending topics                            |
| File Upload System           | Upload post and profile media                                    |
| Admin Panel                  | Platform management and moderation                               |
| Automated Regression Testing | Protect important production behavior from future regressions    |

---

## 6. Out of Scope for MVP

The following features should not be included in the initial MVP. These can be added in later versions.

| Feature                        | Reason for Later Phase                                      |
| ------------------------------ | ----------------------------------------------------------- |
| Direct messaging               | Requires real-time architecture and privacy handling        |
| Real-time chat                 | Requires WebSocket infrastructure                           |
| Poll system                    | Requires dedicated poll options and voting behavior         |
| Company pages                  | Professional expansion feature                              |
| Job board                      | Separate business module                                    |
| Paid subscription              | Monetization phase                                          |
| Video upload                   | Higher storage and processing complexity                    |
| Live streaming                 | Real-time heavy infrastructure                              |
| Newsletter system              | Creator-focused future feature                              |
| Advanced recommendation engine | Requires meaningful user behavior data                      |
| AI post assistant              | Advanced enhancement after core platform stabilization      |
| AI comment assistant           | Enhancement feature after Comment system stabilizes         |
| AI profile assistant           | Professional profile enhancement                            |
| AI thread summary              | More valuable after discussion data grows                   |
| AI semantic search             | Requires stable search and retrieval infrastructure         |
| Ask Nexora                     | Requires permission-aware AI retrieval                      |
| AI notification digest         | Requires Notification system and sufficient activity        |
| AI feed ranking                | Requires meaningful engagement and behavioral data          |
| AI moderation assistant        | Requires mature Report and Moderation workflows              |

---

## 7. Core Feature Requirements

## 7.1 Authentication

### Description

Users must be able to securely register, login, logout, verify email, reset passwords, and manage authentication.

Nexora uses Better Auth as the authentication provider.

### Functional Requirements

- User can register using name, email, and password
- User can login using email and password
- User can logout from the system
- User can view current authenticated account information
- User can verify email
- User can resend verification email
- User can request password reset
- User can reset password
- User can change password after login
- System must protect private routes using authentication middleware
- System must support role-based access control
- Authentication recovery flows should avoid account-enumeration leaks
- Authentication provider failures must not expose sensitive information

---

## 7.2 User Management

### Description

Admins can manage users, roles, and account status.

### Functional Requirements

- Admin can view all users
- Admin can search and filter users
- Admin can view a single user
- Admin can update user role
- Admin can suspend users
- Admin can reactivate users
- Admin can delete users when required
- Suspended or deleted users should not appear through normal public discovery where applicable

---

## 7.3 Profile Management

### Description

Each user will have a public profile that represents their identity on Nexora.

### Profile Information

- Username
- Full name
- Bio
- Headline
- Avatar
- Cover image
- Location
- Website
- Profession
- Company
- Skills
- Education
- Experience

### Functional Requirements

- User can view own profile
- User can update own profile
- User can upload profile avatar
- User can upload cover photo
- Public users can view profile by username
- Username must be unique
- Profile should support professional details
- Public profile must not expose private authentication information
- Suspended or deleted users should not appear through normal public profile access

---

## 7.4 Post Management

### Description

Users can create professional posts, short thoughts, and discussion posts.

Poll support is planned for a later phase.

### Supported MVP Post Types

| Post Type         | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| Professional Post | Career update, achievement, article, professional insight |
| Short Post        | Quick thought or real-time update                         |
| Discussion Post   | Community-based discussion                                |

### Future Post Type

| Post Type | Purpose                   |
| --------- | ------------------------- |
| Poll      | Question-based engagement |

### Post Visibility Types

| Visibility     | Description                                          |
| -------------- | ---------------------------------------------------- |
| Public         | Visible according to public and community rules      |
| Followers      | Visible to owner and followers                       |
| Community Only | Visible to authorized community members              |
| Private        | Visible only to post owner through normal user flows |

### Functional Requirements

- User can create a post
- User can update own post
- User can soft-delete own post
- User can view a single visible post
- User can view personalized home feed
- User can view public feed
- User can view own posts
- User can view public posts by another user
- User can view posts by community
- User can repost another visible post
- User can attach supported images or files
- System can extract hashtags from post content
- User can mention other users
- Post visibility must respect community visibility
- Deleted posts must not appear in normal feed or detail responses
- Post deletion must be idempotent and concurrency-safe

### Media Support

Supported:

- JPEG
- PNG
- WEBP
- PDF

Not supported in MVP:

- SVG
- GIF
- Video

### Public Feed Rule

The public feed must always contain only public-safe content.

Authentication must not cause the public feed to include:

- Private posts
- Follower-only posts
- Community-only posts

### Personalized Feed Rule

The MVP personalized feed may return all posts currently visible to the authenticated user, ordered primarily by recency.

More advanced ranking will be added later.

### Repost Visibility Rule

A repost must never make the original post visible to a broader audience.

Visibility hierarchy:

Public → Followers → Private

Rules:

- Public source can be reposted as Public, Followers, or Private
- Followers source can be reposted as Followers or Private
- Private source can be reposted only as Private
- Community-only content cannot be reposted into a broader non-community context
- Reposting a repost should point to the canonical original post

---

## 7.5 Comment Management

### Description

Users can comment on visible posts and reply to existing top-level comments.

### MVP Reply Structure

Nexora will support one level of replies in the MVP.

Allowed:

Comment → Reply

Not allowed:

Comment → Reply → Reply

### Functional Requirements

- User can add comment to a visible post
- User can reply to a top-level comment
- User can view comments under a visible post
- User can update own comment
- User can delete own comment
- Admin or Super Admin can delete inappropriate comments
- Authorized community moderators can delete comments in their community
- Replying to an existing reply should return a validation error
- Deleted comments should not appear in normal comment listings
- Replies under a deleted parent may remain stored but are hidden in MVP
- Comment deletion should be idempotent and concurrency-safe

### Comment Listing

- Pagination applies to top-level comments
- Top-level comments should display newest first
- Replies should display oldest first
- Replies must not recursively contain more replies

---

## 7.6 Reaction System

### Description

Users can react to posts and comments using social-style reactions.

### Supported Reactions

| Reaction   | Purpose                         |
| ---------- | ------------------------------- |
| Like       | General appreciation            |
| Love       | Strong positive reaction        |
| Insightful | Valuable or informative content |
| Celebrate  | Achievement or positive update  |
| Funny      | Humorous content                |

### Functional Requirements

- User can react to a visible post
- User can remove reaction from a post
- User can react to a visible comment
- User can remove reaction from a comment
- One user should have only one active reaction per post or comment
- Repeating the same reaction should not create duplicate records
- Changing reaction should update the existing reaction
- Reaction creation should use atomic database behavior
- Concurrent reaction requests should not create duplicate records
- Reaction removal should remain idempotent
- User should be able to remove a stale reaction even after losing target visibility

---

## 7.7 Voting System

### Description

Voting will be used mainly for discussion-style and community-based content.

### Supported Votes

| Vote Type | Purpose                              |
| --------- | ------------------------------------ |
| Upvote    | Increase content value or visibility |
| Downvote  | Decrease content value or visibility |

### Functional Requirements

- User can upvote a post
- User can downvote a post
- User can remove vote from a post
- User can upvote a comment
- User can downvote a comment
- User can remove vote from a comment
- One user should have only one active vote per post or comment
- Vote changes should not create duplicate vote records
- Vote removal should be idempotent

---

## 7.8 Follow System

### Description

Users can follow other users to build a social and professional network.

### Functional Requirements

- User can follow another active user
- User can unfollow another user
- User can view followers of a user
- User can view following list of a user
- User can receive suggested users
- User cannot follow themselves
- Duplicate follow requests should not create duplicate relationships
- User should still be able to unfollow someone who later becomes suspended or unavailable

---

## 7.9 Community System

### Description

Communities are topic-based spaces where users can post, discuss, vote, and connect around shared interests.

### Community Visibility Types

| Visibility | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| Public     | Anyone can discover and view according to platform rules     |
| Restricted | Discovery may be public but participation requires access    |
| Private    | Only approved members can view and participate               |

### Community Roles

| Role      | Description                                  |
| --------- | -------------------------------------------- |
| Owner     | Creator and main controller of the community |
| Admin     | Can manage members, rules, and moderation    |
| Moderator | Can moderate posts and comments              |
| Member    | Can participate in community activities      |

### Functional Requirements

- User can create a community
- User can update owned community
- User can delete owned community
- User can join a community
- User can leave a community
- User can view community details according to visibility
- User can view accessible community posts
- Community owner can manage members
- Community owner can assign admins and moderators
- Authorized community roles can manage rules
- Moderator can remove inappropriate posts or comments
- Community-level authority must remain limited to that community
- Suspended communities must not grant normal community access

---

## 7.10 Community Rule Management

### Description

Each community can have rules to guide user behavior.

### Functional Requirements

- Community owner, admin, or authorized moderator can add rules
- Users can view accessible community rules
- Authorized community roles can update rules
- Authorized community roles can delete rules

---

## 7.11 Bookmark System

### Description

Users can privately save useful posts for later reading.

### Functional Requirements

- User can bookmark a visible post
- User can remove a bookmark
- User can view own bookmarked posts
- One user should not bookmark the same post multiple times
- Bookmark removal should be idempotent
- Bookmark data should remain private to the user

---

## 7.12 Notification System

### Description

Users should receive notifications for important activity and engagement.

### Notification Events

| Event                 | Description                                  |
| --------------------- | -------------------------------------------- |
| Follow                | Someone follows the user                     |
| Reaction              | Someone reacts to the user’s post or comment |
| Comment               | Someone comments on the user’s post          |
| Reply                 | Someone replies to the user’s comment        |
| Mention               | Someone mentions the user                    |
| Repost                | Someone reposts the user’s post              |
| Community Invite      | User receives a community invitation         |
| Community Role Update | User role changes inside a community         |

### Functional Requirements

- User can view own notifications
- User can filter unread notifications
- User can mark one notification as read
- User can mark all notifications as read
- User can delete notification
- Notifications should not expose content the user is no longer authorized to view
- Real-time delivery may be introduced later

---

## 7.13 Report System

### Description

Users can report harmful, abusive, misleading, spam, or inappropriate content.

### Report Targets

- User
- Post
- Comment
- Community

### Report Status

| Status   | Description                   |
| -------- | ----------------------------- |
| Pending  | Report is waiting for review  |
| Reviewed | Admin has reviewed the report |
| Resolved | Action has been taken         |
| Rejected | Report was not valid          |

### Functional Requirements

- User can create a report
- Moderator, Admin, or Super Admin can view all reports
- Moderator, Admin, or Super Admin can filter reports by status
- Moderator, Admin, or Super Admin can view single report details
- Moderator, Admin, or Super Admin can update report status
- Admin can take action based on report
- Report creation should be rate-limited
- Future AI moderation may assist with report prioritization
- Updating Report workflow status does not automatically mutate its target
- All Report reviewers receive the same existing Report DTO in the MVP

---

## 7.14 Search System

### Description

Users can search across the platform.

### Search Areas

- Users
- Posts
- Communities
- Hashtags

### Functional Requirements

- User can perform global search
- User can search users
- User can search posts
- User can search communities
- User can search hashtags
- Search results should support pagination
- Search must respect existing visibility and privacy rules
- Private or inaccessible content must not appear in search results

---

## 7.15 Hashtag System

### Description

Hashtags help users discover posts around common topics.

### Functional Requirements

- System can extract hashtags from posts
- Hashtags should be normalized
- Duplicate hashtags should be avoided
- User can view trending hashtags
- User can view posts under a specific hashtag
- Hashtag pages should support pagination
- Deleted or inaccessible posts should not appear through public hashtag results

---

## 7.16 Professional Profile System

### Description

Users can add professional details to their profile, similar to LinkedIn.

### Functional Requirements

- User can add experience
- User can update experience
- User can delete experience
- User can add education
- User can update education
- User can delete education
- User can add skills
- User can delete skills
- Public profile can show professional details
- Professional records should be editable only by their owner

---

## 7.17 File Upload System

### Description

Users upload media only through the Post or Profile mutation that owns it.

### Functional Requirements

- User can attach zero to five supported files to Post creation through the `media` multipart field
- User can replace a profile avatar through the `file` multipart field
- User can replace a cover image through the `file` multipart field
- Uploaded files should be stored in cloud storage
- System should validate file type
- System should validate file size
- Important upload flows should validate actual file signatures where applicable
- Failed database operations should clean newly uploaded temporary assets where required

---

## 7.18 Admin Panel

### Description

Admins need a centralized panel to control users, content, communities, reports, and platform health.

### Functional Requirements

- Admin can view dashboard statistics
- Admin can view total users
- Admin can view total posts
- Admin can view total communities
- Admin can view total reports
- Admin can view pending reports
- Admin can manage users
- Admin can manage posts
- Admin can manage communities
- Admin can manage reports
- Admin can suspend communities
- Admin can delete harmful posts
- Admin can perform platform-level moderation according to role

---

## 7.19 Future AI Intelligence System

### Description

Nexora will introduce a dedicated AI Intelligence System in future versions.

The AI system will help users create better content, understand discussions, discover relevant information, receive personalized recommendations, and interact with platform knowledge.

AI will operate as an enhancement layer and must never replace authentication, authorization, visibility, privacy, database integrity, or moderation authority.

### AI Capability Areas

| Capability               | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| AI Post Assistant        | Improve or generate post drafts                        |
| AI Comment Assistant     | Improve clarity, tone, and professionalism             |
| AI Profile Assistant     | Improve professional profile content                   |
| AI Thread Summary        | Summarize long discussions                             |
| AI Semantic Search       | Search Nexora content by meaning                       |
| Related Content          | Find related posts and discussions                     |
| People Recommendation    | Suggest relevant professionals                         |
| Community Recommendation | Suggest relevant communities                           |
| Notification Digest      | Summarize important activity                           |
| AI Feed Intelligence     | Assist future feed ranking                             |
| AI Moderation Assistant  | Assist report prioritization                           |
| Ask Nexora               | Platform-aware conversational assistant                |

### Functional Requirements

- User can request AI assistance while creating a post
- User can improve existing post drafts
- User can shorten or expand content
- User can change writing tone
- User can request professional rewriting
- User can improve comments before submission
- User can improve profile headline or bio
- User can summarize long discussions
- User can perform semantic search
- User can discover related content
- User can receive AI-assisted recommendations
- User can receive summarized notification digests
- Moderators can receive AI-assisted report analysis
- AI must never automatically publish content without user confirmation
- AI must not independently delete content or suspend users
- AI must only receive content the requester is already authorized to access

---

## 7.20 Ask Nexora

### Description

Ask Nexora will be a platform-aware AI assistant that allows authenticated users to ask questions about Nexora content they are authorized to access.

### Example Queries

- What are people discussing about TypeScript this week?
- Find posts about PostgreSQL performance
- Summarize this discussion
- Find professionals discussing AI engineering
- Summarize my bookmarked backend posts
- What important discussions did I miss?
- Show important topics from my communities

### Functional Requirements

- Personalized Ask Nexora queries require authentication
- AI retrieval must respect normal Nexora visibility rules
- AI must not receive unauthorized private content
- AI should reference source Nexora content where practical
- User should be able to open relevant source posts, profiles, or communities
- AI must not decide user permissions by itself

---

## 8. Database Entity Overview

The following entities are required for the Nexora MVP.

| Entity             | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| User               | Stores account and authentication-related information |
| Profile            | Stores public user profile information                |
| Follow             | Stores follower and following relationships           |
| Post               | Stores all platform posts                             |
| Post Media         | Stores media files attached to posts                  |
| Comment            | Stores comments and replies                           |
| Post Reaction      | Stores reactions on posts                             |
| Comment Reaction   | Stores reactions on comments                          |
| Vote               | Stores upvote and downvote data                       |
| Community          | Stores community information                          |
| Community Member   | Stores community membership and roles                 |
| Community Rule     | Stores community rules                                |
| Bookmark           | Stores saved posts                                    |
| Notification       | Stores user notifications                             |
| Report             | Stores user-submitted reports                         |
| Hashtag            | Stores hashtag information                            |
| Post Hashtag       | Connects posts with hashtags                          |
| Mention            | Stores user mentions                                  |
| Experience         | Stores user work experience                           |
| Education          | Stores user education history                         |
| Skill              | Stores available skill names                          |
| User Skill         | Connects users with skills                            |

### Future AI Entities

The following entities may be added when AI features are implemented.

| Entity                   | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| AI Usage                 | Track AI usage, limits, and cost metadata        |
| AI Conversation          | Store Ask Nexora conversation metadata           |
| AI Message               | Store conversation messages where required       |
| Content Embedding        | Store semantic-search vector references          |
| AI Moderation Assessment | Store non-authoritative moderation analysis      |

---

## 9. API Design Standard

### 9.1 Base URL

/api/v1

### 9.2 API Response Standard

Every successful API response should include:

| Field      | Description                                  |
| ---------- | -------------------------------------------- |
| success    | Indicates whether the request was successful |
| statusCode | HTTP status code                             |
| message    | Human-readable message                       |
| data       | Returned data object or array                |
| meta       | Pagination metadata when needed              |

Every error response should include:

| Field         | Description                            |
| ------------- | -------------------------------------- |
| success       | False for failed request               |
| statusCode    | HTTP status code                       |
| message       | Error summary                          |
| errorMessages | Field-level or detailed error messages |

Production responses must not expose internal database errors, credentials, stack traces, or sensitive provider information.

### 9.3 Pagination Standard

Standard offset-paginated APIs should support:

| Query Parameter | Purpose                       |
| --------------- | ----------------------------- |
| page            | Current page number           |
| limit           | Number of items per page      |
| sortBy          | Field used for sorting        |
| sortOrder       | Ascending or descending order |
| searchTerm      | Keyword search                |

High-volume timeline APIs such as feeds may use cursor-based pagination.

---

## 10. Authentication API Routes

| Method | Endpoint                              | Access  | Purpose                           |
| ------ | ------------------------------------- | ------- | --------------------------------- |
| POST   | /api/v1/auth/register                 | Public  | Register a new user               |
| POST   | /api/v1/auth/login                    | Public  | Login user                        |
| POST   | /api/v1/auth/logout                   | Private | Logout user                       |
| GET    | /api/v1/auth/me                       | Private | Get current logged-in user        |
| POST   | /api/v1/auth/verify-email             | Public  | Verify user email                 |
| POST   | /api/v1/auth/resend-verification-email| Public  | Resend verification email         |
| POST   | /api/v1/auth/forgot-password          | Public  | Send password reset request       |
| POST   | /api/v1/auth/reset-password           | Public  | Reset password using token        |
| POST   | /api/v1/auth/change-password          | Private | Change current password           |

---

## 11. User API Routes

| Method | Endpoint                  | Access             | Purpose               |
| ------ | ------------------------- | ------------------ | --------------------- |
| GET    | /api/v1/users             | Admin, Super Admin | Get all users         |
| GET    | /api/v1/users/\:id        | Private            | Get single user by ID |
| PATCH  | /api/v1/users/\:id/role   | Admin, Super Admin | Update user role      |
| PATCH  | /api/v1/users/\:id/status | Admin, Super Admin | Update user status    |
| DELETE | /api/v1/users/\:id        | Admin, Super Admin | Delete user           |

---

## 12. Profile API Routes

| Method | Endpoint                    | Access  | Purpose                        |
| ------ | --------------------------- | ------- | ------------------------------ |
| GET    | /api/v1/profiles/me         | Private | Get own profile                |
| PATCH  | /api/v1/profiles/me         | Private | Update own profile             |
| PATCH  | /api/v1/profiles/me/avatar  | Private | Upload profile avatar          |
| PATCH  | /api/v1/profiles/me/cover   | Private | Upload cover photo             |
| GET    | /api/v1/profiles/\:username | Public  | Get public profile by username |

---

## 13. Post API Routes

| Method | Endpoint                              | Access                         | Purpose                    |
| ------ | ------------------------------------- | ------------------------------ | -------------------------- |
| POST   | /api/v1/posts                         | Private                        | Create a post              |
| GET    | /api/v1/posts/feed                    | Private                        | Get personalized home feed |
| GET    | /api/v1/posts/public-feed             | Public                         | Get public feed            |
| GET    | /api/v1/posts/my-posts                | Private                        | Get own posts              |
| GET    | /api/v1/posts/user/\:userId           | Public                         | Get public posts by user   |
| GET    | /api/v1/posts/community/\:communityId | Public or Community Member     | Get accessible community posts |
| POST   | /api/v1/posts/\:id/repost             | Private                        | Repost another post        |
| GET    | /api/v1/posts/\:id                    | Public or Private              | Get visible single post    |
| PATCH  | /api/v1/posts/\:id                    | Post Owner                     | Update post                |
| DELETE | /api/v1/posts/\:id                    | Post Owner, Platform Admin/Super Admin, or scoped Community Owner/Admin/Moderator | Soft-delete post |

---

## 14. Comment API Routes

| Method | Endpoint                             | Access                                                 | Purpose                |
| ------ | ------------------------------------ | ------------------------------------------------------ | ---------------------- |
| POST   | /api/v1/posts/\:postId/comments      | Private                                                | Add comment to post    |
| GET    | /api/v1/posts/\:postId/comments      | Public or Private                                      | Get visible comments   |
| POST   | /api/v1/comments/\:commentId/replies | Private                                                | Reply to comment       |
| PATCH  | /api/v1/comments/\:id                | Comment Owner                                          | Update comment         |
| DELETE | /api/v1/comments/\:id                | Comment Owner, Platform Admin/Super Admin, or scoped Community Owner/Admin/Moderator | Delete comment |

---

## 15. Reaction API Routes

| Method | Endpoint                               | Access  | Purpose                      |
| ------ | -------------------------------------- | ------- | ---------------------------- |
| POST   | /api/v1/posts/\:postId/reactions       | Private | Create or change post reaction |
| DELETE | /api/v1/posts/\:postId/reactions       | Private | Remove reaction from post    |
| POST   | /api/v1/comments/\:commentId/reactions | Private | Create or change comment reaction |
| DELETE | /api/v1/comments/\:commentId/reactions | Private | Remove reaction from comment |

---

## 16. Vote API Routes

| Method | Endpoint                           | Access  | Purpose                  |
| ------ | ---------------------------------- | ------- | ------------------------ |
| POST   | /api/v1/posts/\:postId/votes       | Private | Create or change vote    |
| DELETE | /api/v1/posts/\:postId/votes       | Private | Remove vote from post    |
| POST   | /api/v1/comments/\:commentId/votes | Private | Create or change vote    |
| DELETE | /api/v1/comments/\:commentId/votes | Private | Remove vote from comment |

---

## 17. Follow API Routes

| Method | Endpoint                         | Access  | Purpose             |
| ------ | -------------------------------- | ------- | ------------------- |
| POST   | /api/v1/users/\:userId/follow    | Private | Follow user         |
| DELETE | /api/v1/users/\:userId/follow    | Private | Unfollow user       |
| GET    | /api/v1/users/\:userId/followers | Public  | Get user followers  |
| GET    | /api/v1/users/\:userId/following | Public  | Get user following  |
| GET    | /api/v1/users/suggestions         | Private | Get suggested users |

---

## 18. Community API Routes

| Method | Endpoint                                                | Access                               | Purpose                 |
| ------ | ------------------------------------------------------- | ------------------------------------ | ----------------------- |
| POST   | /api/v1/communities                                     | Private                              | Create community        |
| GET    | /api/v1/communities                                     | Public                               | Get all communities     |
| GET    | /api/v1/communities/\:slug                              | Public or Private                    | Get community by slug   |
| PATCH  | /api/v1/communities/\:id                                | Community Owner or Admin             | Update community        |
| DELETE | /api/v1/communities/\:id                                | Community Owner or Platform Admin    | Delete community        |
| POST   | /api/v1/communities/\:id/join                           | Private                              | Join community          |
| DELETE | /api/v1/communities/\:id/leave                          | Private                              | Leave community         |
| GET    | /api/v1/communities/\:id/members                        | Public or Community Member           | Get community members   |
| PATCH  | /api/v1/communities/\:communityId/members/\:userId/role | Community Owner or Admin             | Update member role      |
| PATCH  | /api/v1/communities/\:communityId/members/\:userId/status | Community Owner or Admin           | Update membership status |
| DELETE | /api/v1/communities/\:communityId/members/\:userId      | Community Owner, Admin, or Moderator | Remove community member |

---

## 19. Community Rule API Routes

| Method | Endpoint                                | Access                            | Purpose               |
| ------ | --------------------------------------- | --------------------------------- | --------------------- |
| POST   | /api/v1/communities/\:communityId/rules | Community Owner, Admin, Moderator | Add community rule    |
| GET    | /api/v1/communities/\:communityId/rules | Public or Community Member        | Get community rules   |
| PATCH  | /api/v1/community-rules/\:ruleId        | Community Owner, Admin, Moderator | Update community rule |
| DELETE | /api/v1/community-rules/\:ruleId        | Community Owner, Admin, Moderator | Delete community rule |

---

## 20. Bookmark API Routes

| Method | Endpoint                         | Access  | Purpose                  |
| ------ | -------------------------------- | ------- | ------------------------ |
| POST   | /api/v1/posts/\:postId/bookmarks | Private | Bookmark post            |
| DELETE | /api/v1/posts/\:postId/bookmarks | Private | Remove bookmark          |
| GET    | /api/v1/bookmarks                | Private | Get own bookmarked posts |

---

## 21. Notification API Routes

| Method | Endpoint                        | Access  | Purpose                        |
| ------ | ------------------------------- | ------- | ------------------------------ |
| GET    | /api/v1/notifications           | Private | Get own notifications          |
| PATCH  | /api/v1/notifications/\:id/read | Private | Mark notification as read      |
| PATCH  | /api/v1/notifications/read-all  | Private | Mark all notifications as read |
| DELETE | /api/v1/notifications/\:id      | Private | Delete notification            |

---

## 22. Report API Routes

| Method | Endpoint                    | Access             | Purpose              |
| ------ | --------------------------- | ------------------ | -------------------- |
| POST   | /api/v1/reports             | Private            | Create report        |
| GET    | /api/v1/reports             | Moderator, Admin, Super Admin | Get all reports      |
| GET    | /api/v1/reports/\:id        | Moderator, Admin, Super Admin | Get single report    |
| PATCH  | /api/v1/reports/\:id/status | Moderator, Admin, Super Admin | Update report status |

---

## 23. Search API Routes

| Method | Endpoint                   | Access | Purpose            |
| ------ | -------------------------- | ------ | ------------------ |
| GET    | /api/v1/search             | Public | Global search      |
| GET    | /api/v1/search/users       | Public | Search users       |
| GET    | /api/v1/search/posts       | Public | Search posts       |
| GET    | /api/v1/search/communities | Public | Search communities |

### Search Filters

| Query Parameter | Purpose         |
| --------------- | --------------- |
| query           | Search keyword  |
| type            | Search category |
| page            | Page number     |
| limit           | Result limit    |

---

## 24. Trending And Hashtag API Routes

| Method | Endpoint                     | Access                | Purpose               |
| ------ | ---------------------------- | --------------------- | --------------------- |
| GET    | /api/v1/trending/posts       | Public, optional auth | Get trending Posts    |
| GET    | /api/v1/hashtags/trending    | Public                | Get trending Hashtags |
| GET    | /api/v1/hashtags/\:tag/posts | Public                | Get posts by Hashtag  |

Trending Posts and Hashtags use one inclusive rolling seven-day window.
Post candidates are guest-public and therefore have the same IDs and ranking
for every caller. Optional authentication may change any viewer-dependent field
in the canonical Post response, including votes, bookmarks, and visible
original-Post content.

Post ranking uses raw stored relationship counts in this order: Reactions,
Comments, Reposts, Votes, creation time, and ID. Soft-deleted Comment and Repost
rows intentionally continue contributing in v1, while displayed response counts
retain their canonical visibility semantics. No score or ranking metadata is
exposed.

Trending Hashtag `postCount` is the number of qualifying seven-day public Post
associations, not the stored Hashtag counter or an all-time count. A selected
association whose Hashtag cannot be resolved is an internal consistency failure.
Trending Users and Communities remain deferred.

---

## 25. Professional Profile API Routes

### Experience Routes

| Method | Endpoint                        | Access  | Purpose             |
| ------ | ------------------------------- | ------- | ------------------- |
| POST   | /api/v1/profile/experience      | Private | Add experience      |
| GET    | /api/v1/profile/experience      | Private | Get own experiences |
| PATCH  | /api/v1/profile/experience/\:id | Private | Update experience   |
| DELETE | /api/v1/profile/experience/\:id | Private | Delete experience   |

### Education Routes

| Method | Endpoint                       | Access  | Purpose           |
| ------ | ------------------------------ | ------- | ----------------- |
| POST   | /api/v1/profile/education      | Private | Add education     |
| GET    | /api/v1/profile/education      | Private | Get own education |
| PATCH  | /api/v1/profile/education/\:id | Private | Update education  |
| DELETE | /api/v1/profile/education/\:id | Private | Delete education  |

### Skill Routes

| Method | Endpoint                    | Access  | Purpose        |
| ------ | --------------------------- | ------- | -------------- |
| POST   | /api/v1/profile/skills      | Private | Add skill      |
| GET    | /api/v1/profile/skills      | Private | Get own skills |
| DELETE | /api/v1/profile/skills/\:id | Private | Delete skill   |

---

## 26. Admin API Routes

| Method | Endpoint                               | Access             | Purpose                                  |
| ------ | -------------------------------------- | ------------------ | ---------------------------------------- |
| GET    | /api/v1/admin/dashboard                | Admin, Super Admin | Get operational dashboard statistics     |
| GET    | /api/v1/admin/posts                    | Admin, Super Admin | Get the Post moderation inventory        |
| GET    | /api/v1/admin/communities              | Admin, Super Admin | Get the Community moderation inventory   |
| PATCH  | /api/v1/admin/communities/\:id/status  | Admin, Super Admin | Set Community ACTIVE/SUSPENDED status    |

The Admin namespace contains Admin-specific aggregates, inventories, and Community suspension. Canonical domain mutations remain with their owning feature APIs:

- User administration uses `/api/v1/users`.
- Report moderation uses `/api/v1/reports`.
- Post moderation deletion uses `DELETE /api/v1/posts/:id`.
- Community deletion uses `DELETE /api/v1/communities/:id`.

---

## 27. File Upload API Routes

| Method | Endpoint                       | Access  | Multipart Field | Purpose                |
| ------ | ------------------------------ | ------- | --------------- | ---------------------- |
| POST   | /api/v1/posts                  | Private | `media`         | Create Post with media |
| PATCH  | /api/v1/profiles/me/avatar     | Private | `file`          | Replace avatar         |
| PATCH  | /api/v1/profiles/me/cover      | Private | `file`          | Replace cover image    |

Upload is route-free infrastructure. There is no standalone `/api/v1/uploads`
resource in the MVP. Generic temporary assets, signed direct uploads, and video
upload remain deferred.

---

## 28. Future AI API Routes

These routes are planned for later versions and are not required for the initial MVP.

### 28.1 AI Content Assistance

| Method | Endpoint                        | Access  | Purpose                       |
| ------ | ------------------------------- | ------- | ----------------------------- |
| POST   | /api/v1/ai/posts/improve        | Private | Improve post draft            |
| POST   | /api/v1/ai/posts/generate       | Private | Generate post draft           |
| POST   | /api/v1/ai/posts/hashtags       | Private | Suggest hashtags              |
| POST   | /api/v1/ai/comments/improve     | Private | Improve comment               |
| POST   | /api/v1/ai/profiles/improve     | Private | Improve professional profile  |

### 28.2 AI Understanding

| Method | Endpoint                                    | Access             | Purpose                   |
| ------ | ------------------------------------------- | ------------------ | ------------------------- |
| POST   | /api/v1/ai/posts/\:postId/summary           | Viewer-aware       | Summarize discussion      |
| POST   | /api/v1/ai/communities/\:communityId/summary | Viewer-aware     | Summarize community       |
| POST   | /api/v1/ai/notifications/digest             | Private            | Generate activity digest  |

### 28.3 AI Discovery

| Method | Endpoint                                 | Access       | Purpose                      |
| ------ | ---------------------------------------- | ------------ | ---------------------------- |
| GET    | /api/v1/ai/search                       | Public/Private | Semantic search            |
| GET    | /api/v1/ai/posts/\:postId/related       | Viewer-aware | Find related posts           |
| GET    | /api/v1/ai/people/recommended           | Private      | Recommend professionals      |
| GET    | /api/v1/ai/communities/recommended      | Private      | Recommend communities        |

### 28.4 Ask Nexora

| Method | Endpoint          | Access  | Purpose                            |
| ------ | ----------------- | ------- | ---------------------------------- |
| POST   | /api/v1/ai/ask    | Private | Ask questions about Nexora content |

### 28.5 AI Moderation

| Method | Endpoint                                     | Access             | Purpose                        |
| ------ | -------------------------------------------- | ------------------ | ------------------------------ |
| POST   | /api/v1/ai/moderation/analyze               | Moderator, Admin, Super Admin | Analyze reported content      |
| GET    | /api/v1/ai/moderation/reports/\:reportId    | Moderator, Admin, Super Admin | View AI moderation assessment |

---

## 29. Feed Logic

### 29.1 Feed Sources

The home feed should include visible content from:

- Followed users
- Joined communities
- Public communities
- Recent public posts
- Trending public posts

### 29.2 MVP Feed Behavior

During the MVP, the personalized feed may return all content currently visible to the authenticated user, ordered primarily by recency.

Visibility rules must be applied before pagination and ranking.

### 29.3 Feed Ranking Factors

| Factor          | Purpose                                    |
| --------------- | ------------------------------------------ |
| Recency         | Newer posts should appear higher           |
| Reaction Count  | Higher engagement improves ranking         |
| Comment Count   | Active discussion improves ranking         |
| Repost Count    | Shared content gets more visibility        |
| Vote Score      | Useful for community discussion ranking    |
| Follow Match    | Posts from followed users get priority     |
| Community Match | Posts from joined communities get priority |

### 29.4 Future AI Ranking Factors

Future AI-assisted ranking may additionally consider:

- Topic similarity
- User interests
- Community interests
- Engagement history
- Negative feedback
- Semantic relevance

AI ranking must only rank posts that the existing backend visibility rules already permit the user to access.

---

## 30. Security Requirements

### 30.1 Authentication Security

- Passwords must be securely hashed
- Private routes must require authentication
- Admin routes must require role-based authorization
- User sessions must be securely managed
- Password reset tokens must expire
- Authentication secrets must never be exposed

### 30.2 Authorization Rules

- Users can update only their own profiles
- Users can update only their own posts
- Users can update only their own comments
- Delete permissions must follow explicit owner/moderator/admin rules
- Community moderators can moderate only authorized communities
- Admins can manage platform-level content
- Super Admin has full system access
- Authorization failures should avoid leaking inaccessible resource existence where appropriate

### 30.3 Visibility Rules

Content visibility must be enforced before returning data.

Post visibility should consider:

- Author account status
- Post deletion status
- Community visibility
- Community membership
- Follow relationship
- Post visibility level

Search, Comment, Reaction, Vote, Bookmark, Notification, and future AI features must respect the same visibility rules.

### 30.4 Validation Rules

- All request body data must be validated
- Query parameters must be validated
- Route parameters must be validated
- File uploads must be validated
- Unknown fields should be rejected where strict contracts apply
- Database-dependent validation should remain in service logic

### 30.5 Rate Limiting

Rate limiting should be applied to:

- Login
- Register
- Forgot password
- Verification resend
- Create post
- Create comment
- Create reply
- Reaction mutations
- Report content
- Future AI requests

### 30.6 Proxy Security

- Production must explicitly configure trusted proxy depth
- Development and test environments may default to no trusted proxies
- Raw `X-Forwarded-For` headers should not be trusted directly
- Production proxy configuration must match actual deployment topology

### 30.7 Error Security

Production error responses must not expose:

- Database internals
- Prisma errors
- Stack traces
- Authentication secrets
- Session tokens
- Cloud storage credentials
- Sensitive provider responses

---

## 31. AI Security and Privacy Requirements

AI features must follow all existing Nexora security and privacy rules.

### Functional Requirements

- AI must not receive authentication tokens
- AI must not receive session secrets
- AI must not decide whether a user has access to content
- Authorization must happen before AI retrieval
- AI should receive only the content required for the requested task
- AI must not receive inaccessible private content
- AI-generated values must be validated before storage
- AI cannot directly perform privileged database operations
- AI must not automatically suspend users
- AI must not automatically permanently ban users
- AI must not automatically delete content without deterministic platform authorization
- AI moderation output should remain advisory
- AI endpoints should have dedicated usage limits
- AI logs should not contain sensitive user data unnecessarily
- Failure of the AI provider must not break normal Nexora functionality

### AI Data Flow

The correct flow is:

User
→ Authentication
→ Authorization and Visibility
→ Allowed Data
→ AI Service
→ AI Provider
→ Output Validation
→ User

---

## 32. Automated Testing and Quality Requirements

### Description

Nexora should use targeted automated regression tests to protect high-risk platform behavior.

Automated tests should be stored in the GitHub repository but should not run as part of the normal live production request process.

### Important Areas to Test

- Authentication
- Authorization
- Post visibility
- Community visibility
- Comment permissions
- Reaction concurrency
- Vote uniqueness
- Bookmark uniqueness
- Soft-delete concurrency
- Rate limiting
- Validation
- Privacy-safe errors
- Database integrity

### Testing Rules

- Tests must not use the production database
- Integration tests should use a dedicated test database
- Test fixtures should be isolated
- Test cleanup should delete only test-owned data
- Production deployment should be blocked when important regression tests fail
- Simple boilerplate does not require exhaustive testing

---

## 33. Technical Recommendation

### 33.1 Backend Stack

| Area           | Recommended Technology |
| -------------- | ---------------------- |
| Runtime        | Node.js                |
| Framework      | Express.js             |
| Language       | TypeScript             |
| ORM            | Prisma                 |
| Database       | PostgreSQL             |
| Validation     | Zod                    |
| Authentication | Better Auth            |
| File Storage   | Cloudinary             |
| Email          | Nodemailer or Resend   |
| Cache          | Redis in later phase   |
| Realtime       | Socket.IO in later phase |

### 33.2 Frontend Stack

| Area          | Recommended Technology |
| ------------- | ---------------------- |
| Framework     | Next.js                |
| Language      | TypeScript             |
| Styling       | Tailwind CSS           |
| UI Components | shadcn/ui              |
| Server State  | TanStack Query         |
| Forms         | React Hook Form        |
| Validation    | Zod                    |
| Client State  | Zustand                |
| Animation     | Framer Motion or GSAP  |

### 33.3 Future AI Stack

| Area                | Recommended Technology / Approach      |
| ------------------- | -------------------------------------- |
| AI Provider         | Provider-agnostic integration          |
| Large Language Model| Configurable model provider            |
| Embeddings          | Provider-configurable embedding model  |
| Vector Search       | PostgreSQL with pgvector               |
| Retrieval           | Authorization-aware RAG                |
| Cache               | Redis in later phase                   |
| Streaming           | Server-Sent Events where useful        |
| AI Moderation       | AI assistance + deterministic backend  |
| AI Monitoring       | Usage, latency, errors, and cost        |

---

## 34. Development Phases

### Phase 1: Backend Foundation

- Setup backend project
- Setup database connection
- Setup Prisma
- Setup global error handling
- Setup response format
- Setup validation middleware
- Setup authentication middleware
- Setup rate limiting
- Setup file upload foundation

### Phase 2: Authentication and User

- Authentication module
- User module
- Profile module
- Professional profile modules
- Follow module
- Role-based access control

### Phase 3: Social Core

- Post module
- Comment module
- Reaction module
- Vote module
- Bookmark module

### Phase 4: Community Core

- Community module
- Community member management
- Community rule management
- Community moderation

### Phase 5: Engagement

- Notification module
- Hashtag module
- Mention system
- Trending foundation

### Phase 6: Safety and Admin

- Report module
- Admin dashboard
- Admin moderation
- User suspension
- Community suspension

### Phase 7: Search and Optimization

- Global search
- Feed optimization
- Trending posts
- Trending hashtags
- Performance optimization

### Phase 8: AI Assistance

- AI provider abstraction
- AI usage limits
- AI Post Assistant
- AI Comment Assistant
- AI Profile Assistant
- AI Thread Summary

### Phase 9: AI Discovery

- Content embeddings
- Semantic search
- Related posts
- People recommendations
- Community recommendations

### Phase 10: Nexora Intelligence

- Ask Nexora
- AI notification digest
- AI-assisted feed ranking
- AI recommendation engine
- AI moderation assistant

### Phase 11: Real-Time and Expansion

- Direct messaging
- Real-time notifications
- Poll system
- Company pages
- Job board
- Premium subscription
- Mobile application

---

## 35. Suggested Frontend Pages

| Page                   | Purpose                          |
| ---------------------- | -------------------------------- |
| Home Page              | Landing page                     |
| Login Page             | User login                       |
| Register Page          | User registration                |
| Verify Email Page      | Email verification               |
| Forgot Password Page   | Password recovery                |
| Reset Password Page    | Password reset                   |
| Feed Page              | Main user feed                   |
| Public Feed Page       | Public content discovery         |
| Profile Page           | Public user profile              |
| Profile Settings Page  | Update profile                   |
| Account Settings Page  | Account management               |
| Single Post Page       | View post details                |
| Communities Page       | Browse communities               |
| Create Community Page  | Create new community             |
| Community Details Page | View community and posts         |
| Search Page            | Search users, posts, communities |
| Notifications Page     | View notifications               |
| Bookmarks Page         | View saved posts                 |
| Admin Dashboard        | Admin overview                   |
| Admin Users Page       | Manage users                     |
| Admin Posts Page       | Manage posts                     |
| Admin Communities Page | Manage communities               |
| Admin Reports Page     | Manage reports                   |

---

## 36. Future AI Frontend Features

AI features should initially appear inside existing Nexora pages rather than requiring separate pages for every AI capability.

| AI Feature              | Frontend Location                        |
| ----------------------- | ---------------------------------------- |
| AI Post Assistant       | Create Post interface                    |
| AI Comment Assistant    | Comment composer                         |
| AI Profile Assistant    | Profile Settings                         |
| AI Thread Summary       | Single Post Page                         |
| AI Semantic Search      | Search Page                              |
| Ask Nexora              | Main navigation or dedicated assistant   |
| AI Notification Digest  | Notifications Page                       |
| AI Moderation Assistant | Admin Reports / Moderation interface     |

---

## 37. Production and Deployment Quality

### Description

Nexora should use a deployment process that verifies important behavior before new code reaches production.

### Recommended Flow

Development
→ Git Push / Pull Request
→ Automated Tests
→ TypeScript Validation
→ Prisma Validation
→ Production Build
→ Deployment
→ Health Check

### Production Rules

- Automated test files should be stored in GitHub
- Automated integration tests should run before production deployment
- Tests should not create fake content inside the production database
- Production should run only normal application logic and safe health checks
- A failing important regression test should block deployment
- Production database changes should use controlled Prisma migrations

---

## 38. MVP Success Criteria

The MVP will be considered successful when:

- Users can register and login
- Users can verify and recover accounts
- Users can create and update professional profiles
- Users can follow and unfollow other users
- Users can create, update, delete, and view posts
- Users can see a personalized feed
- Public feed remains public-safe
- Users can comment and reply
- Users can react to posts and comments
- Users can vote on discussion content
- Users can create and join communities
- Community moderation works correctly
- Users can bookmark posts
- Users can report inappropriate content
- Users can receive notifications
- Users can search platform content
- Users can discover hashtags
- Admins can manage users, posts, communities, and reports
- Important visibility and privacy rules are enforced
- Critical production behavior has automated regression protection

AI functionality is not required for initial MVP success.

---

## 39. Future Roadmap

### Version 2

- Direct messaging
- Real-time notifications
- Poll system
- Company pages
- Improved feed ranking
- User recommendations
- Community recommendations
- AI Post Assistant
- AI Comment Assistant
- AI Profile Assistant
- AI Thread Summary

### Version 3

- Ask Nexora
- AI Semantic Search
- AI Notification Digest
- Advanced recommendation engine
- AI-assisted feed ranking
- AI Moderation Assistant
- Job board
- Premium subscription
- Creator analytics
- Newsletter system
- Mobile application

### Version 4

- Advanced recommendation models
- Professional knowledge graph
- Topic intelligence
- AI community insights
- Creator intelligence
- Company intelligence
- Advanced trust and safety automation
- Additional real-time collaboration features

---

## 40. Final MVP Module Priority

Build the backend modules in the following order:

| Priority | Module                       |
| -------- | ---------------------------- |
| 1        | Authentication               |
| 2        | User                         |
| 3        | Profile                      |
| 4        | Professional Profile         |
| 5        | Follow                       |
| 6        | Community                    |
| 7        | Post                         |
| 8        | Comment                      |
| 9        | Reaction                     |
| 10       | Vote                         |
| 11       | Bookmark                     |
| 12       | Notification                 |
| 13       | Report                       |
| 14       | Search                       |
| 15       | Hashtag / Trending           |
| 16       | Admin / Moderation           |

This order keeps the Nexora MVP clean, scalable, and easier to debug.

---

## 41. Future AI Module Priority

After the stable Nexora MVP is completed, AI modules should be developed in the following order:

| Priority | Module                         |
| -------- | ------------------------------ |
| 1        | AI Foundation                  |
| 2        | AI Post Assistant              |
| 3        | AI Comment Assistant           |
| 4        | AI Profile Assistant           |
| 5        | AI Thread Summary              |
| 6        | AI Semantic Search             |
| 7        | Ask Nexora                     |
| 8        | AI Notification Digest         |
| 9        | AI Recommendations             |
| 10       | AI Feed Intelligence           |
| 11       | AI Moderation Assistant        |

---

## 42. Core Engineering Principles

Nexora development should follow these principles:

- Security before convenience
- Privacy-safe authorization
- Clear module boundaries
- Strict request validation
- Database-dependent rules handled by service logic
- Centralized visibility policies
- Atomic database operations where required
- Concurrency-safe mutations
- Idempotent create/delete behavior where appropriate
- Narrow public response contracts
- No sensitive Prisma entities returned directly
- Shared policies should not depend on feature services
- Automated regression protection for high-risk behavior
- AI must remain separate from deterministic platform security rules

---

## 43. AI Responsibility Boundary

AI may:

- Assist users
- Rewrite content
- Suggest content
- Summarize discussions
- Search content
- Recommend people or communities
- Rank authorized content
- Classify moderation risk
- Explain information

AI must not independently control:

- Authentication
- Authorization
- Content visibility
- Database permissions
- User roles
- Account suspension
- Permanent bans
- Destructive moderation
- Privacy rules

The Nexora backend remains the source of truth for all platform permissions and business rules.

---

# End of PRD
