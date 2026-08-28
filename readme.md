<div align="center">

# 🚀 Nexora Backend

### *Enterprise-Grade API Engine for Next-Generation Social Networks & Professional Identity Platforms*

**A modular, high-performance TypeScript backend delivering rich social feeds, professional graphs, community moderation, real-time discovery, and AI writing assistance.**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-Security-FF5722?style=for-the-badge&logo=auth0&logoColor=white)](https://better-auth.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-2.19-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-22C55E?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Build Status](https://img.shields.io/badge/Status-Production--Ready-00C853?style=for-the-badge)]()

---

[📖 Product Specs (PRD)](./resource/PRD.md) · [📊 ERD Diagram](./resource/erd-diagram.png) · [⚡ API Base (`/api/v1`)](#-api-endpoints--data-flow) · [🚀 Setup Guide](#-installation--local-setup) · [📦 Architecture](#-system-architecture--internal-workflow)

</div>

---

## 🎨 Project Preview & System Visuals

Nexora is designed **API-first**, serving as a robust, versioned REST service for decoupled web platforms, mobile clients, and microservices.

<div align="center">

### 📐 Database Schema & Entity Relationship Diagram

<a href="./resource/erd-diagram.png">
  <img src="./resource/erd-diagram.png" alt="Nexora Database Entity Relationship Diagram" width="880" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</a>

*Figure 1: Normalized relational graph powering social feeds, member roles, content moderation, and engagement metrics.*

</div>

<br />

<!-- <div align="center">

### 💻 Client & API Explorer Showcase

| Desktop Client Preview | API Dashboard & Metrics |
| :---: | :---: |
| ![Client Preview Placeholder](./public/preview.png) | ![Dashboard Preview Placeholder](./public/dashboard-preview.png) |
| *Figure 2.1: Modern web client consuming Nexora endpoints* | *Figure 2.2: Admin dashboard & telemetry overview* |

</div>

> **Note**: Replace `./public/preview.png` and `./public/dashboard-preview.png` with live application screenshots or interactive API docs (Swagger/Postman). -->

---

## 💡 Project Overview

**Nexora** is a production-grade backend application engineered to handle the complex engineering demands of modern professional social platforms. It combines rich identity creation, multi-tier publishing, engagement graphs, sub-community management, algorithmic discovery, and native AI generation into a single, cohesive architecture.

### What Problem It Solves
Building a social network requires far more than basic CRUD routes. It requires managing visibility permissions, preventing race conditions on engagement counters, enforcing multi-scope moderation policies, maintaining transactional read consistency, and isolating external integrations (like Cloudinary and LLM providers). Nexora solves these challenges out of the box with strict architectural boundaries and production-hardened patterns.

### Target Audience & Use Cases
- **Enterprise Web & Mobile Applications**: Decoupled backend for professional social apps (LinkedIn / Reddit hybrids).
- **Niche Communities & Knowledge Networks**: Multi-tenant community infrastructure with role-based member moderation.
- **AI-Native Creator Platforms**: Built-in AI copilot for drafting, optimizing, and tagging content.

---

## 🛡️ Core Value & Engineering Excellence

Why Nexora is more than "just another CRUD app":

- 🔒 **Visibility-Aware Read Engine**: Computes dynamic post, profile, and community access depending on viewer relationships, blocking lists, member status, and target privacy settings.
- ⚡ **Concurrency-Safe Mutations**: Employs compare-and-swap (CAS) logic, conditional updates, and transactional claim locks to prevent race conditions in notifications and engagement metrics.
- 🧪 **Snapshot-Consistent Read Models**: Leverages PostgreSQL `REPEATABLE READ` transaction snapshots via Prisma to guarantee data integrity across complex, multi-query responses.
- 🛡️ **Multi-Tiered Authorization Matrix**: Enforces independent platform roles (`USER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`), community roles (`OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`), resource ownership, and target-sensitive access rules.
- 🔌 **Decoupled External Adapters**: Media uploads and Gemini AI models are fully isolated behind factory interfaces, keeping external provider failures sanitized and easily testable.

---

## 🛠️ Tech Stack & Engineering Tooling

| Domain | Technology | Selected Version | Engineering Rationale |
| :--- | :--- | :--- | :--- |
| **Runtime** | **Node.js** | `v20.x+ (ESM)` | Native ES module support, high I/O throughput, and modern async execution. |
| **Language** | **TypeScript** | `v6.0+` | Strict static typing across controllers, domain services, DTOs, and Prisma schemas. |
| **API Framework** | **Express.js** | `v5.2+` | Modern Express 5 routing core with enhanced promise rejection handling & sub-routers. |
| **Database** | **PostgreSQL** | `v16+` | ACID-compliant relational data store with advanced indexing and aggregation capabilities. |
| **ORM / Query Engine**| **Prisma** | `v7.8+` | Type-safe query generation, normalized domain schemas, and `@prisma/adapter-pg` driver. |
| **Authentication** | **Better Auth** | `v1.6+` | Secure session management, email verification, password recovery, and Google OAuth 2.0. |
| **Validation** | **Zod** | `v4.4+` | Strict runtime payload validation, URL query parameter parsing, and schema normalization. |
| **AI Integration** | **Google GenAI** | `v2.19+` | Gemini model integration for structured, JSON-guaranteed AI copy generation. |
| **Media Management** | **Cloudinary + Multer**| `v2.10+ / v2.1+`| Memory buffer multipart parsing and provider-backed asset hosting with CAS keys. |
| **Mail Services** | **Nodemailer + EJS** | `v8.0+ / v3.1+` | Async transactional emails with customized HTML/CSS responsive templates. |
| **Build & Tooling** | **tsup + tsx** | `v8.5+ / v4.22+`| Zero-config ESM bundle compilation and instant-rebuild development server. |
| **Testing & Quality** | **Node Test Runner** | `Native` | Ultra-fast unit testing and real PostgreSQL integration test runner execution. |

---

## 🏗️ System Architecture & Internal Workflow

Nexora follows a **Domain-Driven Layered Architecture** that strictly segregates HTTP transport, authentication middleware, business logic validation, database transactions, and third-party integrations.

```mermaid
flowchart TD
    subgraph Client Layer
        C[Web / Mobile Client Application]
    end

    subgraph Transport & Security Layer
        E[Express 5 Server]
        BA[Better Auth Middleware]
        RL[Rate Limiter & CORS]
        ZV[Zod Schema Validator]
    end

    subgraph Business Logic Layer
        CTL[Domain Controllers]
        SVC[Domain Services]
        POL[Authorization Policies]
    end

    subgraph Data & Provider Layer
        PR[(PostgreSQL via Prisma 7)]
        CL[Cloudinary Storage Adapter]
        AI[Google Gemini AI Adapter]
        EM[Nodemailer / EJS Email Engine]
    end

    C -->|HTTPS / REST / FormData| E
    E --> BA
    BA --> RL
    RL --> ZV
    ZV --> CTL
    CTL --> POL
    POL --> SVC
    SVC -->|Repeatable Read Snapshot| PR
    SVC -->|Multipart Buffer| CL
    SVC -->|Stateless Prompt| AI
    SVC -->|Transactional Mail| EM
    SVC -->|Standardized DTO Envelope| C
```

### 🔁 Request Lifecycle Workflow

1. **Ingress & Parsing**: Express 5 receives incoming requests, applying CORS rules, secure cookie parsers, and trust-proxy headers.
2. **Session Authentication**: Better Auth evaluates session tokens (or Bearer headers) for `/api/v1/*` routes.
3. **Guard Middleware**: Rate-limiting rules and Zod schema validators inspect request parameters, body, and query payloads.
4. **Controller Handoff**: Clean HTTP controllers extract validated input and pass normalized DTOs to domain-specific services.
5. **Policy Authorization**: Domain policies compute resource ownership, community permissions, and platform role privileges.
6. **Persistence & Transactions**: Services execute database operations inside PostgreSQL `REPEATABLE READ` transaction blocks using Prisma 7.
7. **External Provider Calls**: Media uploads or AI copy requests execute through isolated adapter factories.
8. **Response Normalization**: Output is wrapped in Nexora's standardized JSON response envelope and returned to the caller.

---

## 🔌 API Endpoints & Data Flow

Nexora exposes a clean, versioned RESTful API under the base path `/api/v1`. Native authentication endpoints are mounted directly under `/api/auth`.

### 1. Authentication & Profile Management

| Method | Endpoint | Description | Request Payload / Query | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account | `{ email, password, name, username }` | Account created & session initialized |
| `POST` | `/api/v1/auth/login` | Authenticate existing user | `{ email, password }` | Set-Cookie session & user summary |
| `POST` | `/api/v1/auth/logout` | Terminate current session | *Authenticated request* | Clears authentication session |
| `GET` | `/api/v1/auth/me` | Fetch active user profile | *Authenticated request* | Canonical user DTO with credentials |
| `GET` | `/api/v1/profiles/me` | Get active user profile | *Authenticated request* | Detailed profile DTO |
| `PATCH`| `/api/v1/profiles/me` | Update bio, headline, links | `{ headline, bio, location, skills }` | Updated profile object |
| `PATCH`| `/api/v1/profiles/me/avatar`| Upload profile avatar | Multipart Form (`file`) | Cloudinary media URL & metadata |
| `GET` | `/api/v1/profiles/:username`| View public user profile | Header: `Optional Session` | Viewer-enriched public profile DTO |

### 2. Posts, Comments & Engagement

| Method | Endpoint | Description | Request Payload / Query | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/posts` | Create post with optional media | Form Data (`content`, `media`, `communityId`)| Created post object with media links |
| `GET` | `/api/v1/posts` | Paginated feed discovery | Query: `?page=1&limit=10&feedType=following` | Bounded list of post DTOs |
| `GET` | `/api/v1/posts/:id` | View post details | Header: `Optional Session` | Viewer-aware post details |
| `DELETE`| `/api/v1/posts/:id` | Soft-delete owned post | *Authenticated request* | Deletion acknowledgement |
| `POST` | `/api/v1/posts/:postId/comments` | Comment on a post | `{ content }` | Created comment DTO |
| `POST` | `/api/v1/comments/:id/replies` | Threaded reply to comment | `{ content }` | Threaded reply DTO |
| `POST` | `/api/v1/posts/:id/reactions` | Toggle emoji reaction | `{ type: "LIKE" \| "HEART" \| "FIRE" }` | Updated reaction breakdown |
| `POST` | `/api/v1/posts/:id/vote` | Upvote or downvote post | `{ type: "UPVOTE" \| "DOWNVOTE" }` | Current vote tally & user state |
| `POST` | `/api/v1/posts/:id/bookmark`| Save post to bookmarks | *Authenticated request* | Bookmark state confirmation |

### 3. Communities & Algorithmic Discovery

| Method | Endpoint | Description | Request Payload / Query | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/communities` | Create sub-community | `{ name, slug, description, privacy }` | Created community workspace DTO |
| `GET` | `/api/v1/communities/:slug` | View community homepage | Header: `Optional Session` | Community info, counts & role |
| `PATCH`| `/api/v1/communities/:id/members/:userId/status`| Manage member status | `{ status: "APPROVED" \| "BANNED" }` | Updated member role/status DTO |
| `GET` | `/api/v1/search` | Multi-domain global search | Query: `?q=typescript&type=all` | Categorized users, posts & groups |
| `GET` | `/api/v1/trending/posts` | 7-day trending posts feed | Query: `?limit=10` | Database-ranked post candidates |
| `GET` | `/api/v1/hashtags/trending`| 7-day trending hashtags | Query: `?limit=20` | Ranked hashtag counts |

### 4. Artificial Intelligence Copilot

| Method | Endpoint | Description | Request Payload / Query | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/posts/improve` | Rewrite or expand post text | `{ content, action: "SHORTEN" \| "EXPAND", tone }` | AI-suggested content draft |
| `POST` | `/api/v1/ai/posts/generate`| Generate complete post draft| `{ topic, keyPoints, tone }` | Structured post content proposal |
| `POST` | `/api/v1/ai/posts/hashtags`| Extract smart hashtags | `{ content, limit: 5 }` | Array of relevant `#hashtags` |
| `POST` | `/api/v1/ai/profiles/improve`| Refine bio or headline copy| `{ field: "bio" \| "headline", content }` | Polished profile copy suggestions |

### 📦 Standardized API Response Envelope

All API responses strictly implement Nexora's uniform JSON envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource retrieved successfully",
  "data": {
    "id": "post_clx9821a00001",
    "content": "Exploring the powerful architecture of Nexora Backend!",
    "author": {
      "username": "arnabsaga",
      "name": "Arnab Saga"
    }
  }
}
```

---

## ⭐ Key Features Breakdown

### 👤 1. Social & Professional Identity Graph
- **Rich User Profiles**: Customizable experience records, education background, tech skills, location, headline, bio, avatar, and cover banners.
- **Engagement Feed**: Multi-media posts, nested threaded comments, custom emoji reactions, Reddit-style upvoting/downvoting, and personal bookmarks.
- **Social Graph**: Follow/unfollow mechanics, viewer-aware feed ordering, user mentions (`@username`), and auto-detected hashtag indexing.

### 👥 2. Sub-Community Engine & Granular Moderation
- **Multi-Tenant Workspaces**: Public, private, or restricted sub-communities with custom rules, badges, and cover assets.
- **Role Hierarchy**: Scoped permissions distinguishing Community Owners, Admins, Moderators, and Members.
- **Platform Moderation**: Unified report processing pipeline covering Users, Posts, Comments, and Communities with reversible suspension actions.

### 🔍 3. Real-Time Discovery & Algorithmic Feeds
- **Universal & Dedicated Search**: High-performance PostgreSQL full-text and indexed search across users, posts, hashtags, and groups.
- **7-Day Trending Engine**: Time-decayed database ranking algorithms evaluating post engagement velocity and hashtag frequency.

### 🤖 4. AI Writing Copilot (Google Gemini Integration)
- **Content Enhancement**: Instant post polishing, text shortening/expanding, and tone adjustment (Professional, Casual, Technical).
- **Post Generation & Hashtag Extraction**: Automated post drafting from bullet points and smart hashtag recommendations.
- **Profile Optimizer**: AI-assisted rewriting of headlines and professional summaries.

---

## 💻 Installation & Local Setup

Follow these simple steps to set up and run Nexora Backend locally on your machine.

### 📋 Prerequisites

Ensure you have the following software installed:
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v11.5.0` or higher (`npm i -g pnpm`)
- **PostgreSQL**: `v16.0` or higher running locally or hosted (e.g., Neon / Supabase)
- **Cloudinary Account**: For media uploads
- **Google Gemini API Key**: For AI copilot routes

---

### 📥 Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/ArnabSaga/Nexora-Backend.git
cd Nexora-Backend
pnpm install
```

---

### 🔑 Step 2: Configure Environment Variables

Create a `.env` file in the project root directory:

```bash
cp .env.example .env
```

Populate the `.env` file with your credentials (see [Environment Variables](#-environment-variables) for details).

---

### 🗄️ Step 3: Initialize Database & Run Migrations

Generate the Prisma client and apply database migrations to your PostgreSQL database:

```bash
# Generate type-safe Prisma client
pnpm generate

# Apply versioned database migrations
pnpm migrate
```

---

### 🚀 Step 4: Launch Development Server

Start the local server with hot-reloading:

```bash
pnpm dev
```

The API will start listening at:
`http://localhost:5000/api/v1`

---

### 🏗️ Step 5: Build for Production

To create an optimized production ESM bundle:

```bash
# Compile ESM build to /dist
pnpm build

# Start production server
pnpm start
```

---

## 🔐 Environment Variables

| Variable Name | Required | Description | Example Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Server execution environment | `development` / `production` |
| `PORT` | **Yes** | Port number for Express listener | `5000` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection connection string | `postgresql://postgres:pass@localhost:5432/nexora` |
| `BETTER_AUTH_SECRET` | **Yes** | Random 32+ character signing key | `super-secret-random-key-32-chars` |
| `BETTER_AUTH_URL` | **Yes** | Backend URL for auth callbacks | `http://localhost:5000` |
| `FRONTEND_URL` | **Yes** | Allowed CORS client domain | `http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Cloudinary cloud tenant name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | **Yes** | Cloudinary API secret | `abcde-fghij-klmno-pqrst` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | **Yes** | Target Gemini model version | `gemini-2.5-flash` |
| `MAIL_SMTP_HOST` | Production| SMTP mail server host | `smtp.mailtrap.io` |
| `MAIL_SMTP_PORT` | Production| SMTP server port | `587` |
| `MAIL_SMTP_USER` | Production| SMTP account username | `mailer@example.com` |
| `MAIL_SMTP_PASS` | Production| SMTP account password | `secretpassword` |
| `MAIL_SMTP_FROM` | Production| Default email sender address | `Nexora <no-reply@nexora.com>` |
| `TEST_DATABASE_URL` | Testing | Dedicated PostgreSQL database for tests | `postgresql://postgres:pass@localhost:5432/nexora_test` |

---

## 📁 Folder Structure

```bash
Nexora-Backend/
 ┣ 📂 prisma/
 ┃ ┣ 📂 migrations/          # Versioned SQL migration files
 ┃ ┗ 📂 schema/              # Domain-partitioned Prisma schemas (.prisma)
 ┣ 📂 public/                # Static preview assets and documentation graphics
 ┣ 📂 resource/              # System architecture PRD & ERD graphics
 ┣ 📂 src/
 ┃ ┣ 📂 app/
 ┃ ┃ ┣ 📂 config/            # Strongly-typed environment validators
 ┃ ┃ ┣ 📂 lib/               # Database client, auth & provider bindings
 ┃ ┃ ┣ 📂 middleware/        # Auth, role policies, rate limiters & Zod guards
 ┃ ┃ ┣ 📂 module/            # Domain-driven feature modules (26 modules)
 ┃ ┃ ┣ 📂 router/            # Versioned API routes mapping (/api/v1)
 ┃ ┃ ┣ 📂 shared/            # Shared DTO envelopes, helpers & contracts
 ┃ ┃ ┗ 📂 templates/         # EJS transactional email templates
 ┃ ┣ 📜 app.ts               # Express 5 application setup & middleware assembly
 ┃ ┗ 📜 server.ts            # Entrypoint: Database connection & server listener
 ┣ 📂 tests/
 ┃ ┣ 📂 unit/                # Fast unit regression tests for factories & schemas
 ┃ ┣ 📂 integration/         # Integration suite executed against test database
 ┃ ┗ 📂 runners/             # Database safety runner orchestrator
 ┣ 📜 package.json           # Scripts, dependencies & metadata
 ┣ 📜 prisma.config.ts       # Prisma engine & adapter configuration
 ┗ 📜 tsconfig.json          # TypeScript strict compiler parameters
```

---

## 🧪 Testing & Quality Assurance

Nexora features a rigorous testing suite separating isolated unit tests from real database integration tests.

```bash
# Run unit tests
pnpm test:unit

# Run PostgreSQL integration suite (requires TEST_DATABASE_URL)
pnpm test:integration

# Run full test suite (Unit + Integration)
pnpm test

# Run TypeScript static type checking
pnpm exec tsc --noEmit

# Validate Prisma schema definitions
pnpm exec prisma validate
```

---

## 🛣️ Roadmap & Future Scope

- [ ] **Vector Search & RAG**: Integrate Pgvector for semantic content retrieval and smart feed recommendations.
- [ ] **Real-Time Messaging**: WebSockets / Server-Sent Events (SSE) for instant direct messaging & notification streaming.
- [ ] **Interactive API Explorer**: Deploy Swagger / OpenAPI interactive documentation.
- [ ] **Official Client Applications**: Release web (Next.js) and mobile (React Native) applications consuming Nexora.

---

## 📜 License

This project is licensed under the **ISC License**. See the [package.json](./package.json) file for full details.

---

## 👨‍💻 Author & Maintainer

Built with passion and engineering discipline by **[Arnab Saga](https://github.com/ArnabSaga)**.

- **GitHub**: [@ArnabSaga](https://github.com/ArnabSaga)
- **Project Repository**: [https://github.com/ArnabSaga/Nexora-Backend](https://github.com/ArnabSaga/Nexora-Backend)

---

<div align="center">

**Nexora Backend** · *Decoupled, Scalable, Production-Grade Social Network Infrastructure.*

</div>
