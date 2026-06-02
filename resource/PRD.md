# Nexora Product Requirement Document

## 1. Project Overview

### 1.1 Project Name

Nexora

### 1.2 Project Type

Social Media and Professional Community Platform

### 1.3 Product Vision

Nexora is a modern social media platform that combines the professional networking style of LinkedIn, the topic-based community discussion style of Reddit, and the short-form real-time posting style of X.

The platform will allow users to build professional identities, share posts, follow people, join communities, discuss topics, react to content, vote on community discussions, save posts, report inappropriate content, and receive notifications.

### 1.4 Tagline

Where professionals share, discuss, and grow.

### 1.5 Product Positioning

Nexora will be positioned as a professional community discussion platform where users can build credibility, share ideas, join meaningful conversations, and grow their personal or professional network.

---

## 2. Product Objective

The main objective of Nexora is to create a scalable and engaging social platform where users can:

* Build a professional public identity
* Share thoughts, professional updates, articles, and discussions
* Follow other users and grow a network
* Join topic-based communities
* Participate in meaningful discussions
* React, comment, vote, repost, and bookmark content
* Discover trending posts, people, hashtags, and communities
* Report harmful or inappropriate content
* Receive notifications for important activities
* Allow admins and moderators to maintain platform safety

---

## 3. Target Users

### 3.1 General Users

Users who want to share posts, follow others, join communities, and engage with content.

### 3.2 Professionals

Users who want to build a professional profile, showcase experience, skills, education, and industry identity.

### 3.3 Community Creators

Users who want to create and manage topic-based communities.

### 3.4 Moderators

Users responsible for maintaining community quality, reviewing reports, and moderating posts or comments.

### 3.5 Admins

Platform administrators who manage users, posts, reports, communities, and overall platform moderation.

---

## 4. User Roles and Permissions

| Role        | Description                | Key Permissions                                                    |
| ----------- | -------------------------- | ------------------------------------------------------------------ |
| User        | Default platform member    | Create posts, comment, react, vote, follow users, join communities |
| Moderator   | Community-level controller | Moderate assigned community posts, comments, members, and reports  |
| Admin       | Platform-level manager     | Manage users, posts, communities, and reports                      |
| Super Admin | Full system owner          | Full access to all platform-level controls                         |

---

## 5. MVP Scope

The first version of Nexora should focus on the core social and community features.

### 5.1 MVP Modules

| Module              | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| Authentication      | Register, login, logout, email verification, password management |
| User Management     | Manage user account, role, and status                            |
| Profile Management  | Public user profile with professional identity                   |
| Post Management     | Create, update, delete, view, and repost content                 |
| Comment Management  | Comment and reply system                                         |
| Reaction System     | Like, love, insightful, celebrate, and funny reactions           |
| Voting System       | Upvote and downvote for discussion-based content                 |
| Follow System       | Follow and unfollow users                                        |
| Community System    | Create, join, leave, and manage communities                      |
| Bookmark System     | Save posts for later                                             |
| Notification System | Notify users about engagement and activity                       |
| Report System       | Report harmful content or users                                  |
| Search System       | Search users, posts, communities, and hashtags                   |
| Admin Panel         | Platform management and moderation                               |

---

## 6. Out of Scope for MVP

The following features should not be included in the first MVP. These can be added in later versions.

| Feature                        | Reason for Later Phase                               |
| ------------------------------ | ---------------------------------------------------- |
| Direct messaging               | Requires real-time architecture and privacy handling |
| AI post writing assistant      | Advanced feature, not required for MVP               |
| AI thread summary              | Can be added after discussion data grows             |
| Job board                      | Separate business module                             |
| Company pages                  | Professional expansion feature                       |
| Paid subscription              | Monetization phase                                   |
| Advanced recommendation engine | Requires user behavior data                          |
| Video upload                   | Higher storage and processing complexity             |
| Live streaming                 | Real-time heavy infrastructure                       |
| Newsletter system              | Creator-focused future feature                       |

---

## 7. Core Feature Requirements

## 7.1 Authentication

### Description

Users must be able to securely register, login, logout, verify email, reset password, and manage authentication.

### Functional Requirements

* User can register using name, email, and password
* User can login using email and password
* User can logout from the system
* User can verify email
* User can request password reset
* User can reset password
* User can change password after login
* System must protect private routes using authentication middleware
* System must support role-based access control

---

## 7.2 User Management

### Description

Admins can manage users, roles, and account status.

### Functional Requirements

* Admin can view all users
* Admin can search and filter users
* Admin can view a single user profile
* Admin can update user role
* Admin can suspend or activate users
* Admin can delete users when required

---

## 7.3 Profile Management

### Description

Each user will have a public profile that represents their identity on Nexora.

### Profile Information

* Username
* Full name
* Bio
* Headline
* Avatar
* Cover image
* Location
* Website
* Profession
* Company
* Skills
* Education
* Experience

### Functional Requirements

* User can view own profile
* User can update own profile
* User can upload profile avatar
* User can upload cover photo
* Public users can view profile by username
* Username must be unique
* Profile should support professional details

---

## 7.4 Post Management

### Description

Users can create different types of posts such as professional posts, short thoughts, discussion posts, and polls.

### Supported Post Types

| Post Type         | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| Professional Post | Career update, achievement, article, professional insight |
| Short Post        | Quick thought or real-time update                         |
| Discussion Post   | Community-based discussion                                |
| Poll              | Question-based engagement                                 |

### Functional Requirements

* User can create a post
* User can update own post
* User can delete own post
* User can view a single post
* User can view home feed
* User can view public feed
* User can view own posts
* User can view posts by another user
* User can view posts by community
* User can repost another post
* User can attach images or files
* User can add hashtags
* User can mention other users

---

## 7.5 Comment Management

### Description

Users can comment on posts and reply to existing comments.

### Functional Requirements

* User can add comment to a post
* User can reply to a comment
* User can view comments under a post
* User can update own comment
* User can delete own comment
* Admin or moderator can delete inappropriate comments
* System should support nested replies

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

* User can react to a post
* User can remove reaction from a post
* User can react to a comment
* User can remove reaction from a comment
* One user should have only one active reaction per post or comment

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

* User can upvote a post
* User can downvote a post
* User can remove vote from a post
* User can upvote a comment
* User can downvote a comment
* User can remove vote from a comment
* One user should have only one active vote per post or comment

---

## 7.8 Follow System

### Description

Users can follow other users to build a social and professional network.

### Functional Requirements

* User can follow another user
* User can unfollow another user
* User can view followers of a user
* User can view following list of a user
* User can receive suggested users
* User cannot follow themselves

---

## 7.9 Community System

### Description

Communities are topic-based spaces where users can post, discuss, vote, and connect around shared interests.

### Community Visibility Types

| Visibility | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| Public     | Anyone can view and join                                     |
| Restricted | Anyone can view, but joining or posting may require approval |
| Private    | Only approved members can view and participate               |

### Community Roles

| Role      | Description                                  |
| --------- | -------------------------------------------- |
| Owner     | Creator and main controller of the community |
| Admin     | Can manage members, rules, and moderation    |
| Moderator | Can moderate posts and comments              |
| Member    | Can participate in community activities      |

### Functional Requirements

* User can create a community
* User can update owned community
* User can delete owned community
* User can join a community
* User can leave a community
* User can view community details
* User can view community posts
* Community owner can manage members
* Community owner can assign moderators
* Community owner or moderator can manage rules
* Moderator can remove inappropriate posts or comments

---

## 7.10 Community Rule Management

### Description

Each community can have rules to guide user behavior.

### Functional Requirements

* Community owner or moderator can add rules
* Users can view community rules
* Community owner or moderator can update rules
* Community owner or moderator can delete rules

---

## 7.11 Bookmark System

### Description

Users can save useful posts for later reading.

### Functional Requirements

* User can bookmark a post
* User can remove a bookmark
* User can view own bookmarked posts
* One user should not bookmark the same post multiple times

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

* User can view own notifications
* User can filter unread notifications
* User can mark one notification as read
* User can mark all notifications as read
* User can delete notification

---

## 7.13 Report System

### Description

Users can report harmful, abusive, misleading, or inappropriate content.

### Report Targets

* User
* Post
* Comment
* Community

### Report Status

| Status   | Description                   |
| -------- | ----------------------------- |
| Pending  | Report is waiting for review  |
| Reviewed | Admin has reviewed the report |
| Resolved | Action has been taken         |
| Rejected | Report was not valid          |

### Functional Requirements

* User can create a report
* Admin can view all reports
* Admin can filter reports by status
* Admin can view single report details
* Admin can update report status
* Admin can take action based on report

---

## 7.14 Search System

### Description

Users can search across the platform.

### Search Areas

* Users
* Posts
* Communities
* Hashtags

### Functional Requirements

* User can perform global search
* User can search users
* User can search posts
* User can search communities
* User can search hashtags
* Search results should support pagination

---

## 7.15 Hashtag System

### Description

Hashtags help users discover posts around common topics.

### Functional Requirements

* System can extract hashtags from posts
* User can view trending hashtags
* User can view posts under a specific hashtag
* Hashtag pages should support pagination

---

## 7.16 Professional Profile System

### Description

Users can add professional details to their profile, similar to LinkedIn.

### Functional Requirements

* User can add experience
* User can update experience
* User can delete experience
* User can add education
* User can update education
* User can delete education
* User can add skills
* User can delete skills
* Public profile can show professional details

---

## 7.17 File Upload System

### Description

Users should be able to upload media files for posts and profiles.

### Functional Requirements

* User can upload a single file
* User can upload multiple files
* User can upload profile avatar
* User can upload cover image
* Uploaded files should be stored in cloud storage
* System should validate file type and size

---

## 7.18 Admin Panel

### Description

Admins need a centralized panel to control users, content, communities, reports, and platform health.

### Functional Requirements

* Admin can view dashboard statistics
* Admin can view total users
* Admin can view total posts
* Admin can view total communities
* Admin can view total reports
* Admin can view pending reports
* Admin can manage users
* Admin can manage posts
* Admin can manage communities
* Admin can manage reports
* Admin can suspend communities
* Admin can delete harmful posts

---

## 8. Database Entity Overview

The following entities are required for the Nexora MVP.

| Entity           | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| User             | Stores account and authentication-related information |
| Profile          | Stores public user profile information                |
| Follow           | Stores follower and following relationships           |
| Post             | Stores all platform posts                             |
| Post Media       | Stores media files attached to posts                  |
| Comment          | Stores comments and replies                           |
| Reaction         | Stores reactions on posts and comments                |
| Vote             | Stores upvote and downvote data                       |
| Community        | Stores community information                          |
| Community Member | Stores community membership and roles                 |
| Community Rule   | Stores community rules                                |
| Bookmark         | Stores saved posts                                    |
| Notification     | Stores user notifications                             |
| Report           | Stores user-submitted reports                         |
| Hashtag          | Stores hashtag information                            |
| Post Hashtag     | Connects posts with hashtags                          |
| Mention          | Stores user mentions                                  |
| Experience       | Stores user work experience                           |
| Education        | Stores user education history                         |
| Skill            | Stores available skill names                          |
| User Skill       | Connects users with skills                            |

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

### 9.3 Pagination Standard

Paginated APIs should support:

| Query Parameter | Purpose                       |
| --------------- | ----------------------------- |
| page            | Current page number           |
| limit           | Number of items per page      |
| sortBy          | Field used for sorting        |
| sortOrder       | Ascending or descending order |
| searchTerm      | Keyword search                |

---

## 10. Authentication API Routes

| Method | Endpoint                     | Access  | Purpose                     |
| ------ | ---------------------------- | ------- | --------------------------- |
| POST   | /api/v1/auth/register        | Public  | Register a new user         |
| POST   | /api/v1/auth/login           | Public  | Login user                  |
| POST   | /api/v1/auth/logout          | Private | Logout user                 |
| GET    | /api/v1/auth/me              | Private | Get current logged-in user  |
| POST   | /api/v1/auth/verify-email    | Public  | Verify user email           |
| POST   | /api/v1/auth/forgot-password | Public  | Send password reset request |
| POST   | /api/v1/auth/reset-password  | Public  | Reset password using token  |
| POST   | /api/v1/auth/change-password | Private | Change current password     |

---

## 11. User API Routes

| Method | Endpoint                 | Access             | Purpose               |
| ------ | ------------------------ | ------------------ | --------------------- |
| GET    | /api/v1/users            | Admin, Super Admin | Get all users         |
| GET    | /api/v1/users/:id        | Private            | Get single user by ID |
| PATCH  | /api/v1/users/:id/role   | Admin, Super Admin | Update user role      |
| PATCH  | /api/v1/users/:id/status | Admin, Super Admin | Update user status    |
| DELETE | /api/v1/users/:id        | Admin, Super Admin | Delete user           |

---

## 12. Profile API Routes

| Method | Endpoint                   | Access  | Purpose                        |
| ------ | -------------------------- | ------- | ------------------------------ |
| GET    | /api/v1/profiles/me        | Private | Get own profile                |
| PATCH  | /api/v1/profiles/me        | Private | Update own profile             |
| PATCH  | /api/v1/profiles/me/avatar | Private | Upload profile avatar          |
| PATCH  | /api/v1/profiles/me/cover  | Private | Upload cover photo             |
| GET    | /api/v1/profiles/:username | Public  | Get public profile by username |

---

## 13. Post API Routes

| Method | Endpoint                             | Access                         | Purpose                    |
| ------ | ------------------------------------ | ------------------------------ | -------------------------- |
| POST   | /api/v1/posts                        | Private                        | Create a post              |
| GET    | /api/v1/posts/feed                   | Private                        | Get personalized home feed |
| GET    | /api/v1/posts/public-feed            | Public                         | Get public feed            |
| GET    | /api/v1/posts/:id                    | Public or Private              | Get single post            |
| GET    | /api/v1/posts/my-posts               | Private                        | Get own posts              |
| GET    | /api/v1/posts/user/:userId           | Public                         | Get posts by user          |
| GET    | /api/v1/posts/community/:communityId | Public or Community Member     | Get community posts        |
| PATCH  | /api/v1/posts/:id                    | Post Owner                     | Update post                |
| DELETE | /api/v1/posts/:id                    | Post Owner, Admin, Super Admin | Delete post                |
| POST   | /api/v1/posts/:id/repost             | Private                        | Repost another post        |

---

## 14. Comment API Routes

| Method | Endpoint                            | Access                                                 | Purpose                |
| ------ | ----------------------------------- | ------------------------------------------------------ | ---------------------- |
| POST   | /api/v1/posts/:postId/comments      | Private                                                | Add comment to post    |
| POST   | /api/v1/comments/:commentId/replies | Private                                                | Reply to comment       |
| GET    | /api/v1/posts/:postId/comments      | Public                                                 | Get comments of a post |
| PATCH  | /api/v1/comments/:id                | Comment Owner                                          | Update comment         |
| DELETE | /api/v1/comments/:id                | Comment Owner, Admin, Super Admin, Community Moderator | Delete comment         |

---

## 15. Reaction API Routes

| Method | Endpoint                              | Access  | Purpose                      |
| ------ | ------------------------------------- | ------- | ---------------------------- |
| POST   | /api/v1/posts/:postId/reactions       | Private | React to post                |
| DELETE | /api/v1/posts/:postId/reactions       | Private | Remove reaction from post    |
| POST   | /api/v1/comments/:commentId/reactions | Private | React to comment             |
| DELETE | /api/v1/comments/:commentId/reactions | Private | Remove reaction from comment |

---

## 16. Vote API Routes

| Method | Endpoint                          | Access  | Purpose                  |
| ------ | --------------------------------- | ------- | ------------------------ |
| POST   | /api/v1/posts/:postId/votes       | Private | Vote on post             |
| DELETE | /api/v1/posts/:postId/votes       | Private | Remove vote from post    |
| POST   | /api/v1/comments/:commentId/votes | Private | Vote on comment          |
| DELETE | /api/v1/comments/:commentId/votes | Private | Remove vote from comment |

---

## 17. Follow API Routes

| Method | Endpoint                        | Access  | Purpose             |
| ------ | ------------------------------- | ------- | ------------------- |
| POST   | /api/v1/users/:userId/follow    | Private | Follow user         |
| DELETE | /api/v1/users/:userId/follow    | Private | Unfollow user       |
| GET    | /api/v1/users/:userId/followers | Public  | Get user followers  |
| GET    | /api/v1/users/:userId/following | Public  | Get user following  |
| GET    | /api/v1/users/suggestions       | Private | Get suggested users |

---

## 18. Community API Routes

| Method | Endpoint                                              | Access                               | Purpose                 |
| ------ | ----------------------------------------------------- | ------------------------------------ | ----------------------- |
| POST   | /api/v1/communities                                   | Private                              | Create community        |
| GET    | /api/v1/communities                                   | Public                               | Get all communities     |
| GET    | /api/v1/communities/:slug                             | Public or Private                    | Get community by slug   |
| PATCH  | /api/v1/communities/:id                               | Community Owner or Admin             | Update community        |
| DELETE | /api/v1/communities/:id                               | Community Owner or Platform Admin    | Delete community        |
| POST   | /api/v1/communities/:id/join                          | Private                              | Join community          |
| DELETE | /api/v1/communities/:id/leave                         | Private                              | Leave community         |
| GET    | /api/v1/communities/:id/members                       | Public or Community Member           | Get community members   |
| PATCH  | /api/v1/communities/:communityId/members/:userId/role | Community Owner or Admin             | Update member role      |
| DELETE | /api/v1/communities/:communityId/members/:userId      | Community Owner, Admin, or Moderator | Remove community member |

---

## 19. Community Rule API Routes

| Method | Endpoint                               | Access                            | Purpose               |
| ------ | -------------------------------------- | --------------------------------- | --------------------- |
| POST   | /api/v1/communities/:communityId/rules | Community Owner, Admin, Moderator | Add community rule    |
| GET    | /api/v1/communities/:communityId/rules | Public                            | Get community rules   |
| PATCH  | /api/v1/community-rules/:ruleId        | Community Owner, Admin, Moderator | Update community rule |
| DELETE | /api/v1/community-rules/:ruleId        | Community Owner, Admin, Moderator | Delete community rule |

---

## 20. Bookmark API Routes

| Method | Endpoint                        | Access  | Purpose                  |
| ------ | ------------------------------- | ------- | ------------------------ |
| POST   | /api/v1/posts/:postId/bookmarks | Private | Bookmark post            |
| DELETE | /api/v1/posts/:postId/bookmarks | Private | Remove bookmark          |
| GET    | /api/v1/bookmarks               | Private | Get own bookmarked posts |

---

## 21. Notification API Routes

| Method | Endpoint                       | Access  | Purpose                        |
| ------ | ------------------------------ | ------- | ------------------------------ |
| GET    | /api/v1/notifications          | Private | Get own notifications          |
| PATCH  | /api/v1/notifications/:id/read | Private | Mark notification as read      |
| PATCH  | /api/v1/notifications/read-all | Private | Mark all notifications as read |
| DELETE | /api/v1/notifications/:id      | Private | Delete notification            |

---

## 22. Report API Routes

| Method | Endpoint                   | Access             | Purpose              |
| ------ | -------------------------- | ------------------ | -------------------- |
| POST   | /api/v1/reports            | Private            | Create report        |
| GET    | /api/v1/reports            | Admin, Super Admin | Get all reports      |
| GET    | /api/v1/reports/:id        | Admin, Super Admin | Get single report    |
| PATCH  | /api/v1/reports/:id/status | Admin, Super Admin | Update report status |

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

## 24. Hashtag API Routes

| Method | Endpoint                    | Access | Purpose               |
| ------ | --------------------------- | ------ | --------------------- |
| GET    | /api/v1/hashtags/trending   | Public | Get trending hashtags |
| GET    | /api/v1/hashtags/:tag/posts | Public | Get posts by hashtag  |

---

## 25. Professional Profile API Routes

### Experience Routes

| Method | Endpoint                       | Access  | Purpose             |
| ------ | ------------------------------ | ------- | ------------------- |
| POST   | /api/v1/profile/experience     | Private | Add experience      |
| GET    | /api/v1/profile/experience     | Private | Get own experiences |
| PATCH  | /api/v1/profile/experience/:id | Private | Update experience   |
| DELETE | /api/v1/profile/experience/:id | Private | Delete experience   |

### Education Routes

| Method | Endpoint                      | Access  | Purpose           |
| ------ | ----------------------------- | ------- | ----------------- |
| POST   | /api/v1/profile/education     | Private | Add education     |
| GET    | /api/v1/profile/education     | Private | Get own education |
| PATCH  | /api/v1/profile/education/:id | Private | Update education  |
| DELETE | /api/v1/profile/education/:id | Private | Delete education  |

### Skill Routes

| Method | Endpoint                   | Access  | Purpose        |
| ------ | -------------------------- | ------- | -------------- |
| POST   | /api/v1/profile/skills     | Private | Add skill      |
| GET    | /api/v1/profile/skills     | Private | Get own skills |
| DELETE | /api/v1/profile/skills/:id | Private | Delete skill   |

---

## 26. Admin API Routes

| Method | Endpoint                              | Access             | Purpose                  |
| ------ | ------------------------------------- | ------------------ | ------------------------ |
| GET    | /api/v1/admin/dashboard               | Admin, Super Admin | Get dashboard statistics |
| GET    | /api/v1/admin/posts                   | Admin, Super Admin | Get all posts            |
| DELETE | /api/v1/admin/posts/:id               | Admin, Super Admin | Delete post              |
| GET    | /api/v1/admin/communities             | Admin, Super Admin | Get all communities      |
| PATCH  | /api/v1/admin/communities/:id/suspend | Admin, Super Admin | Suspend community        |
| GET    | /api/v1/admin/reports                 | Admin, Super Admin | Get all reports          |
| PATCH  | /api/v1/admin/reports/:id/resolve     | Admin, Super Admin | Resolve report           |

---

## 27. File Upload API Routes

| Method | Endpoint                 | Access  | Purpose               |
| ------ | ------------------------ | ------- | --------------------- |
| POST   | /api/v1/uploads/single   | Private | Upload single file    |
| POST   | /api/v1/uploads/multiple | Private | Upload multiple files |

---

## 28. Feed Logic

### 28.1 Feed Sources

The home feed should include:

* Posts from followed users
* Posts from joined communities
* Trending public posts
* Recent public posts

### 28.2 Feed Ranking Factors

| Factor          | Purpose                                    |
| --------------- | ------------------------------------------ |
| Recency         | Newer posts should appear higher           |
| Reaction Count  | Higher engagement improves ranking         |
| Comment Count   | Active discussion improves ranking         |
| Repost Count    | Shared content gets more visibility        |
| Vote Score      | Useful for community discussion ranking    |
| Follow Match    | Posts from followed users get priority     |
| Community Match | Posts from joined communities get priority |

### 28.3 Feed Sorting Rule

The default feed should prioritize relevant, recent, and engaging posts. During MVP, the feed can be simple and rule-based. In later versions, a recommendation engine can be added.

---

## 29. Security Requirements

### 29.1 Authentication Security

* Passwords must be securely hashed
* Private routes must require authentication
* Admin routes must require role-based authorization
* User sessions or tokens must be securely managed
* Password reset tokens must expire after a limited time

### 29.2 Authorization Rules

* Users can update only their own profiles
* Users can update or delete only their own posts
* Users can update or delete only their own comments
* Community moderators can moderate only assigned communities
* Admins can manage platform-level content
* Super Admin has full system access

### 29.3 Validation Rules

* All request body data must be validated
* Query parameters must be validated
* Route parameters must be validated
* File uploads must be validated by size and type

### 29.4 Rate Limiting

Rate limiting should be applied to:

* Login
* Register
* Forgot password
* Create post
* Create comment
* Report content

---

## 30. Technical Recommendation

### 30.1 Backend Stack

| Area           | Recommended Technology   |
| -------------- | ------------------------ |
| Runtime        | Node.js                  |
| Framework      | Express.js               |
| Language       | TypeScript               |
| ORM            | Prisma                   |
| Database       | PostgreSQL               |
| Validation     | Zod                      |
| Authentication | JWT or Better Auth       |
| File Storage   | Cloudinary               |
| Email          | Nodemailer or Resend     |
| Cache          | Redis in later phase     |
| Realtime       | Socket.IO in later phase |

### 30.2 Frontend Stack

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

---

## 31. Development Phases

### Phase 1: Backend Foundation

* Setup backend project
* Setup database connection
* Setup global error handling
* Setup response format
* Setup validation middleware
* Setup authentication middleware

### Phase 2: Authentication and User

* Authentication module
* User module
* Profile module
* Role-based access control

### Phase 3: Social Core

* Post module
* Comment module
* Reaction module
* Vote module
* Follow module

### Phase 4: Community Core

* Community module
* Community member management
* Community rule management
* Community moderation

### Phase 5: Engagement

* Bookmark module
* Notification module
* Hashtag module
* Mention system

### Phase 6: Safety and Admin

* Report module
* Admin dashboard
* Admin moderation
* User suspension
* Community suspension

### Phase 7: Search and Optimization

* Global search
* Feed optimization
* Trending posts
* Trending hashtags

---

## 32. Suggested Frontend Pages

| Page                   | Purpose                          |
| ---------------------- | -------------------------------- |
| Home Page              | Landing page                     |
| Login Page             | User login                       |
| Register Page          | User registration                |
| Forgot Password Page   | Password recovery                |
| Reset Password Page    | Password reset                   |
| Feed Page              | Main user feed                   |
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

## 33. MVP Success Criteria

The MVP will be considered successful when:

* Users can register and login
* Users can create and update profiles
* Users can create, update, delete, and view posts
* Users can follow and unfollow other users
* Users can see a personalized feed
* Users can comment and reply
* Users can react to posts and comments
* Users can vote on discussion content
* Users can create and join communities
* Users can bookmark posts
* Users can report inappropriate content
* Users can receive notifications
* Admins can manage users, posts, communities, and reports

---

## 34. Future Roadmap

### Version 2

* Direct messaging
* Real-time notifications
* Poll system
* Company pages
* User recommendation
* Community recommendation
* Improved feed ranking

### Version 3

* AI post assistant
* AI thread summary
* Job board
* Premium subscription
* Creator analytics
* Newsletter system
* Mobile application

---

## 35. Final MVP Module Priority

Build the backend modules in the following order:

| Priority | Module         |
| -------- | -------------- |
| 1        | Authentication |
| 2        | User           |
| 3        | Profile        |
| 4        | Post           |
| 5        | Comment        |
| 6        | Reaction       |
| 7        | Vote           |
| 8        | Follow         |
| 9        | Community      |
| 10       | Bookmark       |
| 11       | Notification   |
| 12       | Report         |
| 13       | Search         |
| 14       | Admin          |

This order will keep the Nexora project clean, scalable, and easier to debug.

---

# End of PRD
