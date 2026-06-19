# Nexora Code Standards

## Core Rule

Nexora code must be modular, type-safe, readable, and scalable. Never mix routing, rendering, business logic, and database access in the same layer.

## Naming Rules

| Item | Rule | Example |
|---|---|---|
| Files | kebab-case or module-name pattern | `post.service.ts` |
| Backend module files | module-name dot layer | `community.controller.ts` |
| Components | PascalCase | `PostCard` |
| Hooks | camelCase starting with use | `useFeed` |
| Variables | camelCase | `currentUser` |
| Types | PascalCase with T prefix optional | `TPost`, `UserProfile` |
| Interfaces | PascalCase | `IPostService` |
| Constants | UPPER_SNAKE_CASE | `MAX_POST_MEDIA` |
| API routes | plural resources | `/api/v1/posts` |
| Database fields | camelCase in Prisma | `createdAt` |

---

## Backend Standards

### Module Structure

Every backend module must follow this pattern:

```txt
module-name/
├── module-name.route.ts
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.validation.ts
├── module-name.interface.ts
├── module-name.constant.ts
└── module-name.utils.ts
```

### Route Rules

Routes only connect middleware and controllers.

Allowed:

- route path
- auth middleware
- role middleware
- validation middleware
- controller function

Not allowed:

- database queries
- business decisions
- response formatting

Example:

```ts
router.post(
  '/',
  auth(),
  validateRequest(PostValidation.createPostSchema),
  PostController.createPost
);
```

### Controller Rules

Controllers only read request data, call service, and send response.

Allowed:

- `req.body`
- `req.params`
- `req.query`
- `req.user`
- `sendResponse`

Not allowed:

- Prisma queries
- complex business logic
- direct file upload processing beyond passing file data to service

Example:

```ts
const createPost = catchAsync(async (req, res) => {
  const result = await PostService.createPost(req.user, req.body, req.files);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Post created successfully',
    data: result,
  });
});
```

### Service Rules

Services own business logic and database operations.

Allowed:

- Prisma queries
- authorization checks not handled by middleware
- transaction logic
- upload processing
- notification creation
- feed ranking logic

Not allowed:

- Express `req` or `res`
- HTTP-specific response formatting

### Validation Rules

Use Zod for every body/query/params contract.

Example:

```ts
const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
    postType: z.enum(['PROFESSIONAL', 'SHORT', 'DISCUSSION', 'POLL']),
    visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'COMMUNITY_ONLY', 'PRIVATE']),
    communityId: z.string().uuid().optional().nullable(),
    hashtags: z.array(z.string()).optional(),
  }),
});
```

### Response Standard

All success responses must use:

```ts
sendResponse(res, {
  statusCode: 200,
  success: true,
  message: 'Data retrieved successfully',
  data,
  meta,
});
```

All errors must flow through the global error handler.

---

## Frontend Standards

### Component Rules

Components should be divided by responsibility:

| Type | Purpose | Example |
|---|---|---|
| Page component | Route-level composition | `app/(main)/feed/page.tsx` |
| Feature component | Feature UI block | `PostComposer` |
| Shared component | Reused common UI | `EmptyState` |
| UI primitive | shadcn/ui component | `Button`, `Dialog` |

### Data Fetching Rules

Use TanStack Query for client-side API data.

- Queries go in hooks
- Mutations go in hooks
- Components call hooks, not API client directly
- Invalidate related queries after mutation

Example:

```ts
export function useFeed(params: FeedParams) {
  return useQuery({
    queryKey: ['feed', params],
    queryFn: () => postApi.getFeed(params),
  });
}
```

### Form Rules

Use React Hook Form + Zod for all forms.

- Form schema must live near feature or in shared package
- Show validation messages under fields
- Disable submit while loading
- Show toast after success/failure

Example:

```ts
const form = useForm<CreatePostInput>({
  resolver: zodResolver(createPostSchema),
  defaultValues: {
    content: '',
    postType: 'SHORT',
    visibility: 'PUBLIC',
  },
});
```

### UI State Rules

Use Zustand only for UI state that is shared across components:

- post composer draft
- open/close modal state
- sidebar collapse state
- temporary filters

Do not put server data in Zustand. Server data belongs in TanStack Query.

---

## TypeScript Rules

- Strict mode must remain enabled
- Avoid `any`
- Prefer explicit return types for services
- Use shared types for API responses
- Use discriminated unions for notification/report types when useful
- Avoid duplicated enum strings across frontend/backend; use shared constants when possible

---

## Error Handling Rules

### Backend

- Throw `AppError` for expected operational errors
- Never leak raw Prisma/database errors to users
- Return clear validation messages
- Use correct HTTP status codes

### Frontend

- Show user-friendly error messages
- Never show raw stack traces
- Use toast for mutation errors
- Use inline messages for form validation
- Use page-level error state for failed queries

---

## Security Rules

- Validate all input on backend
- Check ownership before update/delete
- Check community role before moderation
- Check admin role before platform management
- Rate-limit auth, post, comment, and report creation
- Sanitize content before rendering rich text/HTML
- Validate media file type and size before upload

---

## Git and Commit Rules

Use clear commit messages:

```txt
feat(auth): add login endpoint
feat(post): create post composer UI
fix(feed): handle empty feed state
docs(context): update Nexora build plan
refactor(profile): split experience form component
```

---

## Definition of Done

A feature is done only when:

- UI is implemented
- API is implemented
- Validation is implemented
- Authorization is implemented
- Loading state exists
- Empty state exists where applicable
- Error state exists
- Success toast/message exists for mutations
- Related queries are invalidated
- Documentation/progress tracker is updated
