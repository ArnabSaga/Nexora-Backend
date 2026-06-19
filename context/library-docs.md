# Nexora Library Docs

## Purpose

This file documents how Nexora should use each major library. Use these examples as implementation patterns. Keep all examples Nexora-specific.

---

## Next.js App Router

### Usage

Frontend pages live inside `apps/web/app`. Use route groups to separate auth, main app, and admin.

### Page Pattern

```tsx
// apps/web/app/(main)/feed/page.tsx
import { FeedPage } from '@/components/feed/FeedPage';

export default function Page() {
  return <FeedPage />;
}
```

### Rule

Page files should stay thin. Put real UI inside components.

---

## Tailwind CSS

### Usage

Use Tailwind for layout and styling, but use Nexora tokens from `ui-tokens.md`. Avoid random raw color values.

### Correct

```tsx
<div className="rounded-lg border border-border bg-surface p-6 text-text-primary">
  Nexora post card
</div>
```

### Avoid

```tsx
<div className="rounded-xl bg-[#ffffff] text-gray-900">
  Avoid raw colors
</div>
```

---

## shadcn/ui

### Usage

Use shadcn/ui for primitives such as Button, Card, Dialog, Dropdown Menu, Input, Textarea, Badge, Tabs, Avatar, Sheet, and Table.

### Button Example

```tsx
import { Button } from '@/components/ui/button';

export function FollowButton() {
  return <Button>Follow</Button>;
}
```

### Dialog Example

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ReportDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Report</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
        </DialogHeader>
        <div>Select a reason and submit your report.</div>
      </DialogContent>
    </Dialog>
  );
}
```

### Rule

Do not edit shadcn primitives unnecessarily. Wrap them in Nexora feature components.

---

## TanStack Query

### Usage

Use TanStack Query for server state: feed, posts, comments, profiles, communities, notifications, reports, and admin tables.

### Query Client Setup

```tsx
// apps/web/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### Feed Query Hook

```ts
// apps/web/hooks/use-feed.ts
import { useQuery } from '@tanstack/react-query';
import { postApi } from '@/lib/api/post-api';

export function useFeed(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['feed', params],
    queryFn: () => postApi.getFeed(params),
  });
}
```

### Mutation Hook

```ts
// apps/web/hooks/use-create-post.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi } from '@/lib/api/post-api';

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
    },
  });
}
```

---

## Zustand

### Usage

Use Zustand only for UI state, not server data.

Good use cases:

- post composer draft
- modal open state
- sidebar collapsed state
- selected report target

### Example

```ts
// apps/web/store/composer-store.ts
import { create } from 'zustand';

type ComposerState = {
  content: string;
  setContent: (content: string) => void;
  reset: () => void;
};

export const useComposerStore = create<ComposerState>((set) => ({
  content: '',
  setContent: (content) => set({ content }),
  reset: () => set({ content: '' }),
}));
```

---

## React Hook Form + Zod

### Usage

Use for all forms: auth, profile, post, community, report, admin filters.

### Schema Example

```ts
// packages/shared/validations/post.validation.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required').max(5000),
  postType: z.enum(['PROFESSIONAL', 'SHORT', 'DISCUSSION', 'POLL']),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'COMMUNITY_ONLY', 'PRIVATE']),
  communityId: z.string().uuid().optional().nullable(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
```

### Form Example

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createPostSchema, type CreatePostInput } from '@nexora/shared';

export function PostComposer() {
  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: '',
      postType: 'SHORT',
      visibility: 'PUBLIC',
      communityId: null,
    },
  });

  return <form>{/* form fields */}</form>;
}
```

---

## Express.js

### Usage

Express is the REST API framework. Keep app setup clean and route modules isolated.

### App Setup Pattern

```ts
// apps/api/src/app.ts
import express from 'express';
import cors from 'cors';
import router from './routes';
import { globalErrorHandler } from './middlewares/global-error-handler';
import { notFound } from './middlewares/not-found';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
```

### Route Index Pattern

```ts
// apps/api/src/routes/index.ts
import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { PostRoutes } from '../modules/post/post.route';

const router = Router();

const routes = [
  { path: '/auth', route: AuthRoutes },
  { path: '/posts', route: PostRoutes },
];

routes.forEach((route) => router.use(route.path, route.route));

export default router;
```

---

## Prisma

### Usage

Prisma owns database schema and data access. Use service files for Prisma calls.

### Prisma Client Helper

```ts
// apps/api/src/shared/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

### Transaction Example

```ts
await prisma.$transaction(async (tx) => {
  const post = await tx.post.create({ data: postData });

  await tx.notification.createMany({
    data: notificationData,
  });

  return post;
});
```

### Rule

Use transactions when one action writes multiple related records, such as post + hashtags + mentions + notifications.

---

## JWT / Auth

### Usage

Nexora can use JWT or Better Auth. If JWT is used, prefer short-lived access tokens and secure refresh handling.

### Auth Middleware Example

```ts
export const auth = () => {
  return catchAsync(async (req, _res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError(401, 'You are not authenticated');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  });
};
```

### Role Middleware Example

```ts
export const validateRole = (...roles: string[]) => {
  return catchAsync(async (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'You are not authorized');
    }

    next();
  });
};
```

---

## Cloudinary

### Usage

Use Cloudinary for avatars, cover photos, and post media.

### Upload Helper Example

```ts
import { v2 as cloudinary } from 'cloudinary';

export async function uploadToCloudinary(filePath: string, folder: string) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
```

### Folder Convention

| Media Type | Folder |
|---|---|
| Avatar | `nexora/avatars` |
| Cover Photo | `nexora/covers` |
| Post Media | `nexora/posts` |
| Community Media | `nexora/communities` |

---

## Nodemailer / Resend

### Usage

Use for email verification and password reset.

### Email Helper Pattern

```ts
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  // implementation depends on Nodemailer or Resend
}
```

### Required Email Types

- Verify email
- Reset password
- Security alert later

---

## Socket.IO Later

### Later Use Cases

- Realtime notification
- Direct messaging
- Typing indicator
- Online presence

Do not implement Socket.IO in MVP unless basic REST notification is complete.

---

## Redis Later

### Later Use Cases

- Feed cache
- Rate limiting
- Session cache
- Trending hashtags cache
- Notification count cache

Do not add Redis until PostgreSQL feed and notification logic are stable.
