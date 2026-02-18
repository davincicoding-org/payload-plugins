# Comment System Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the discussions plugin comment components from flat prop-drilling into a context-coordinated tree with single-reply enforcement, collapsible threads, sticky cards, and relative timestamps.

**Architecture:** A new `CommentProvider` owns all state and API logic, exposing a `CommentContext` consumed by descendant components. The old `CommentForm`, `CommentItem`, and `CommentList` are replaced by `CommentComposer`, `CommentCard` + `CommentThread`, and `CommentsPanel`. Base UI primitives handle collapsible replies and scroll areas.

**Tech Stack:** React, CSS Modules with Payload CSS variables, `@base-ui/react` (Collapsible, ScrollArea), `@payloadcms/ui` (Button, formatTimeToNow, useTranslation), `react-textarea-autosize`

---

### Task 1: Install dependency

**Files:**
- Modify: `packages/discussions/package.json`

**Step 1: Install react-textarea-autosize**

Run:
```bash
cd /Users/jarvis/Code/payload-plugins && pnpm add react-textarea-autosize --filter payload-discussions
```

**Step 2: Verify installation**

Run:
```bash
cd /Users/jarvis/Code/payload-plugins && pnpm ls react-textarea-autosize --filter payload-discussions
```
Expected: Shows `react-textarea-autosize` in dependencies.

**Step 3: Commit**

```bash
git add packages/discussions/package.json pnpm-lock.yaml
git commit -m "chore(payload-discussions): add react-textarea-autosize dependency"
```

---

### Task 2: Create CommentContext

**Files:**
- Create: `packages/discussions/src/components/CommentContext.ts`

**Step 1: Write CommentContext**

```ts
'use client'

import { createContext, useContext } from 'react'

export interface CommentContextValue {
  readonly activeReplyId: string | null
  readonly maxDepth: number
  readonly openReply: (id: string) => void
  readonly closeReply: () => void
  readonly submitReply: (parentId: string | null, content: string) => void
}

export const CommentContext = createContext<CommentContextValue | null>(null)

export function useCommentContext(): CommentContextValue {
  const ctx = useContext(CommentContext)
  if (!ctx) throw new Error('Comment components must be used within <CommentProvider>')
  return ctx
}
```

**Step 2: Commit**

```bash
git add packages/discussions/src/components/CommentContext.ts
git commit -m "feat(payload-discussions): add CommentContext for single-reply enforcement"
```

---

### Task 3: Create CommentProvider

**Files:**
- Create: `packages/discussions/src/components/CommentProvider.tsx`
- Reference: `packages/discussions/src/components/Discussions.tsx` (current state/API logic to move)
- Reference: `packages/discussions/src/procedures.ts` (ENDPOINTS)

**Step 1: Write CommentProvider**

This component takes over the state and API logic currently in `Discussions.tsx` (the `comments` state, `handleCreateComment`, `handleReply`, and the recursive `insertReply` helper). It wraps children in `CommentContext.Provider`.

```tsx
'use client'

import { useConfig } from '@payloadcms/ui'
import type { DocumentID, DocumentReference } from '@repo/common'
import { useCallback, useMemo, useState } from 'react'
import { ENDPOINTS } from '@/procedures'
import type { PopulatedComment } from '../types'
import { CommentContext, type CommentContextValue } from './CommentContext'

export interface CommentProviderProps {
  readonly initialComments: readonly PopulatedComment[]
  readonly documentReference: DocumentReference
  readonly maxDepth: number
  readonly children: React.ReactNode
}

export function CommentProvider({
  initialComments,
  documentReference,
  maxDepth,
  children,
}: CommentProviderProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig()

  const [comments, setComments] = useState<readonly PopulatedComment[]>(initialComments)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)

  const openReply = useCallback((id: string) => {
    setActiveReplyId(id)
  }, [])

  const closeReply = useCallback(() => {
    setActiveReplyId(null)
  }, [])

  const submitReply = useCallback(
    async (parentId: string | null, content: string) => {
      if (parentId === null) {
        const populated = await ENDPOINTS.createComment.call(apiRoute, {
          content,
          documentReference,
        })
        setComments((prev) => [populated, ...prev])
      } else {
        const populated = await ENDPOINTS.createReply.call(apiRoute, {
          parentId: parentId as DocumentID,
          content,
        })

        const insertReply = (items: readonly PopulatedComment[]): PopulatedComment[] =>
          items.map((item) =>
            item.id === parentId
              ? { ...item, replies: [...(item.replies || []), populated] }
              : { ...item, replies: item.replies ? insertReply(item.replies) : null },
          )

        setComments((prev) => insertReply(prev))
      }
      setActiveReplyId(null)
    },
    [apiRoute, documentReference],
  )

  const value = useMemo<CommentContextValue>(
    () => ({ activeReplyId, maxDepth, openReply, closeReply, submitReply }),
    [activeReplyId, maxDepth, openReply, closeReply, submitReply],
  )

  return <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
}

/** Expose comments to children via a second context-free approach: pass as prop to CommentsPanel. */
export { type PopulatedComment }
```

Wait — the PRD says CommentsPanel receives `comments` as a prop, not via context. So `CommentProvider` needs to expose the comments list. The cleanest approach: `CommentProvider` renders `CommentsPanel` directly, or we expose comments via context too. Per the design, CommentsPanel takes `comments: Comment[]` as a prop. So CommentProvider should pass comments to its children.

Revised approach: `CommentProvider` also exposes a `useComments()` hook, OR `DiscussionsClient` reads comments from a second piece of state. Simplest: add `comments` to the context value.

Actually, re-reading the PRD: "Does not own context — it is expected to be rendered inside a CommentContext provider." So CommentsPanel gets `comments` as a prop. The parent (`DiscussionsClient`) can own the comments state and pass it down while wrapping in CommentProvider. But we agreed to put state in CommentProvider...

Cleanest resolution: Add a `readonly comments: readonly PopulatedComment[]` to context so CommentsPanel can read it from there. The PRD prop `comments: Comment[]` on CommentsPanel becomes unnecessary — CommentsPanel reads from context instead.

Actually let me re-read the user's preference: they wanted a "new standalone provider file" that owns state and API logic. So let me put comments in context too and have CommentsPanel consume it. This avoids prop threading through DiscussionsClient.

Let me revise the plan to include `comments` in the context value and make CommentsPanel read from context.

```tsx
'use client'

import { useConfig } from '@payloadcms/ui'
import type { DocumentID, DocumentReference } from '@repo/common'
import { useCallback, useMemo, useState } from 'react'
import { ENDPOINTS } from '@/procedures'
import type { PopulatedComment } from '../types'
import { CommentContext, type CommentContextValue } from './CommentContext'

export interface CommentProviderProps {
  readonly initialComments: readonly PopulatedComment[]
  readonly documentReference: DocumentReference
  readonly maxDepth: number
  readonly children: React.ReactNode
}

export function CommentProvider({
  initialComments,
  documentReference,
  maxDepth,
  children,
}: CommentProviderProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig()

  const [comments, setComments] = useState<readonly PopulatedComment[]>(initialComments)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)

  const openReply = useCallback((id: string) => {
    setActiveReplyId(id)
  }, [])

  const closeReply = useCallback(() => {
    setActiveReplyId(null)
  }, [])

  const submitReply = useCallback(
    async (parentId: string | null, content: string) => {
      if (parentId === null) {
        const populated = await ENDPOINTS.createComment.call(apiRoute, {
          content,
          documentReference,
        })
        setComments((prev) => [populated, ...prev])
      } else {
        const populated = await ENDPOINTS.createReply.call(apiRoute, {
          parentId: parentId as DocumentID,
          content,
        })

        const insertReply = (items: readonly PopulatedComment[]): PopulatedComment[] =>
          items.map((item) =>
            item.id === parentId
              ? { ...item, replies: [...(item.replies || []), populated] }
              : { ...item, replies: item.replies ? insertReply(item.replies) : null },
          )

        setComments((prev) => insertReply(prev))
      }
      setActiveReplyId(null)
    },
    [apiRoute, documentReference],
  )

  const value = useMemo<CommentContextValue>(
    () => ({ comments, activeReplyId, maxDepth, openReply, closeReply, submitReply }),
    [comments, activeReplyId, maxDepth, openReply, closeReply, submitReply],
  )

  return <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
}
```

**Step 2: Commit**

```bash
git add packages/discussions/src/components/CommentProvider.tsx
git commit -m "feat(payload-discussions): add CommentProvider with state and API logic"
```

---

### Task 4: Create CommentComposer

**Files:**
- Create: `packages/discussions/src/components/CommentComposer.tsx`
- Create: `packages/discussions/src/components/CommentComposer.module.css`

**Step 1: Write CommentComposer.module.css**

```css
.form {
  border: 1px solid var(--theme-elevation-200);
  border-radius: 0.5rem;
  overflow: hidden;
}

.textarea {
  width: 100%;
  padding: 0.75rem;
  outline: none;
  border: none;
  color: var(--theme-text);
  background-color: transparent;
  resize: none;
  font-family: inherit;
  font-size: 0.875rem;
}

.footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-inline: 0.5rem;
  padding-top: 0.25rem;
  padding-bottom: 0.5rem;
}
```

**Step 2: Write CommentComposer.tsx**

```tsx
'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import styles from './CommentComposer.module.css'

export interface CommentComposerProps {
  readonly placeholder: string
  readonly submitLabel: string
  readonly onSubmit: (content: string) => void
  readonly onCancel?: () => void
  readonly onFocus?: () => void
}

export function CommentComposer({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  onFocus,
}: CommentComposerProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(trimmed)
      setContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isDisabled = !content.trim() || isSubmitting

  return (
    <div className={styles.form}>
      <TextareaAutosize
        className={styles.textarea}
        disabled={isSubmitting}
        minRows={2}
        onChange={(e) => setContent(e.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={content}
      />
      <div className={styles.footer}>
        {onCancel && (
          <Button
            buttonStyle="transparent"
            disabled={isSubmitting}
            onClick={onCancel}
            size="small"
            type="button"
          >
            Cancel
          </Button>
        )}
        <Button
          disabled={isDisabled}
          onClick={handleSubmit}
          size="small"
          type="button"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </Button>
      </div>
    </div>
  )
}
```

Note: `onFocus` is added beyond the PRD to support the top-level composer calling `closeReply()` on focus, as specified in the PRD's CommentsPanel notes.

**Step 3: Commit**

```bash
git add packages/discussions/src/components/CommentComposer.tsx packages/discussions/src/components/CommentComposer.module.css
git commit -m "feat(payload-discussions): add CommentComposer with auto-growing textarea"
```

---

### Task 5: Create CommentCard

**Files:**
- Create: `packages/discussions/src/components/CommentCard.tsx`
- Create: `packages/discussions/src/components/CommentCard.module.css`

**Step 1: Write CommentCard.module.css**

```css
.card {
  border: 1px solid var(--theme-elevation-200);
  border-radius: 0.5rem;
  padding-inline: 0.75rem;
  padding-block: 0.375rem;
  background-color: var(--theme-elevation-100);
}

.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: var(--theme-elevation-500);
}

.author {
  font-weight: 600;
  color: var(--theme-text);
}

.content {
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.actions {
  display: flex;
  margin-top: 0.25rem;
  gap: 0.75rem;
  justify-content: space-between;
  padding-inline: 0.5rem;
}
```

**Step 2: Write CommentCard.tsx**

The PRD defines:
```ts
type CommentData = Pick<Comment, 'author' | 'createdAt' | 'content'>
```

But our actual type is `PopulatedComment` where `author` is `{ id: DocumentID; displayName: string }`. So `CommentData` should pick from `PopulatedComment`.

```tsx
'use client'

import { Button, formatTimeToNow, useTranslation } from '@payloadcms/ui'
import type { PopulatedComment } from '../types'
import styles from './CommentCard.module.css'

type CommentData = Pick<PopulatedComment, 'author' | 'createdAt' | 'content'>

export interface CommentCardProps {
  readonly comment: CommentData
  readonly isReplying: boolean
  readonly onReplyToggle: () => void
  readonly repliesCount: number
  readonly repliesExpanded: boolean
  readonly onToggleReplies: (expanded: boolean) => void
  readonly showReplyButton: boolean
}

export function CommentCard({
  comment,
  isReplying,
  onReplyToggle,
  repliesCount,
  repliesExpanded,
  onToggleReplies,
  showReplyButton,
}: CommentCardProps) {
  const { i18n } = useTranslation()

  const cardClassName = isReplying
    ? `${styles.card} ${styles.sticky}`
    : styles.card

  return (
    <div>
      <div className={cardClassName}>
        <div className={styles.header}>
          <span className={styles.author}>
            {comment.author?.displayName || 'Unknown'}
          </span>
          <span>{formatTimeToNow({ date: comment.createdAt, i18n })}</span>
        </div>
        <div className={styles.content}>{comment.content}</div>
      </div>

      <div className={styles.actions}>
        {showReplyButton && (
          <Button
            buttonStyle="transparent"
            onClick={onReplyToggle}
            size="small"
            type="button"
          >
            {isReplying ? 'Cancel Reply' : 'Reply'}
          </Button>
        )}

        {repliesCount > 0 && (
          <Button
            buttonStyle="transparent"
            onClick={() => onToggleReplies(!repliesExpanded)}
            size="small"
            type="button"
          >
            {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'} {repliesExpanded ? '\u2191' : '\u2193'}
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add packages/discussions/src/components/CommentCard.tsx packages/discussions/src/components/CommentCard.module.css
git commit -m "feat(payload-discussions): add CommentCard with sticky reply and relative time"
```

---

### Task 6: Create CommentThread

**Files:**
- Create: `packages/discussions/src/components/CommentThread.tsx`
- Create: `packages/discussions/src/components/CommentThread.module.css`

**Step 1: Write CommentThread.module.css**

```css
.replies {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-left: 0.5rem;
  padding-left: 1rem;
  border-left: 1px solid var(--theme-elevation-200);
  margin-top: 0.75rem;
  padding-top: 0.5rem;
}
```

**Step 2: Write CommentThread.tsx**

```tsx
'use client'

import { Collapsible } from '@base-ui/react/collapsible'
import { useCallback, useState } from 'react'
import type { PopulatedComment } from '../types'
import { CommentCard } from './CommentCard'
import { CommentComposer } from './CommentComposer'
import { useCommentContext } from './CommentContext'
import styles from './CommentThread.module.css'

export interface CommentThreadProps {
  readonly comment: PopulatedComment
  readonly depth?: number
}

export function CommentThread({ comment, depth = 0 }: CommentThreadProps) {
  const { activeReplyId, maxDepth, openReply, closeReply, submitReply } = useCommentContext()
  const [repliesExpanded, setRepliesExpanded] = useState(depth === 0)

  const replies = comment.replies ?? []
  const isReplying = activeReplyId === comment.id
  const showReplyButton = depth < maxDepth

  const handleReplyToggle = useCallback(() => {
    if (isReplying) {
      closeReply()
    } else {
      openReply(comment.id)
      setRepliesExpanded(true)
    }
  }, [isReplying, closeReply, openReply, comment.id])

  const handleToggleReplies = useCallback((expanded: boolean) => {
    setRepliesExpanded(expanded)
  }, [])

  const handleSubmitReply = useCallback(
    (content: string) => {
      submitReply(comment.id, content)
    },
    [submitReply, comment.id],
  )

  // Collapsible is open when replies are expanded OR when replying (auto-expand)
  const isOpen = repliesExpanded || isReplying

  return (
    <div>
      <CommentCard
        comment={comment}
        isReplying={isReplying}
        onReplyToggle={handleReplyToggle}
        onToggleReplies={handleToggleReplies}
        repliesCount={replies.length}
        repliesExpanded={repliesExpanded}
        showReplyButton={showReplyButton}
      />

      <Collapsible.Root open={isOpen}>
        <Collapsible.Panel>
          <div className={styles.replies}>
            {replies.map((reply) => (
              <CommentThread comment={reply} depth={depth + 1} key={reply.id} />
            ))}

            {isReplying && (
              <CommentComposer
                onCancel={closeReply}
                onSubmit={handleSubmitReply}
                placeholder="Write a reply..."
                submitLabel="Reply"
              />
            )}
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add packages/discussions/src/components/CommentThread.tsx packages/discussions/src/components/CommentThread.module.css
git commit -m "feat(payload-discussions): add CommentThread with collapsible replies"
```

---

### Task 7: Create CommentsPanel

**Files:**
- Create: `packages/discussions/src/components/CommentsPanel.tsx`
- Create: `packages/discussions/src/components/CommentsPanel.module.css`

**Step 1: Write CommentsPanel.module.css**

```css
.root {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.scrollArea {
  max-height: 80vh;
}

.viewport {
  overscroll-behavior: contain;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.placeholder {
  padding: 1rem;
  text-align: center;
  color: var(--theme-elevation-500);
  font-size: 0.875rem;
}

.scrollbar {
  display: flex;
  padding: 1px;
  background-color: var(--theme-elevation-100);
  width: 8px;
  box-sizing: border-box;
}

.thumb {
  flex: 1;
  background-color: var(--theme-elevation-500);
  border-radius: 4px;
  min-height: 24px;
}
```

**Step 2: Write CommentsPanel.tsx**

```tsx
'use client'

import { ScrollArea } from '@base-ui/react/scroll-area'
import { CommentComposer } from './CommentComposer'
import { useCommentContext } from './CommentContext'
import { CommentThread } from './CommentThread'
import styles from './CommentsPanel.module.css'

export function CommentsPanel() {
  const { comments, closeReply, submitReply } = useCommentContext()

  const handleTopLevelSubmit = (content: string) => {
    submitReply(null, content)
  }

  return (
    <div className={styles.root}>
      <CommentComposer
        onFocus={closeReply}
        onSubmit={handleTopLevelSubmit}
        placeholder="Add a comment..."
        submitLabel="Comment"
      />

      <ScrollArea.Root className={styles.scrollArea}>
        <ScrollArea.Viewport className={styles.viewport}>
          <ScrollArea.Content>
            {comments.length === 0 ? (
              <div className={styles.placeholder}>
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className={styles.list}>
                {comments.map((comment) => (
                  <CommentThread comment={comment} depth={0} key={comment.id} />
                ))}
              </div>
            )}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className={styles.scrollbar}>
          <ScrollArea.Thumb className={styles.thumb} />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add packages/discussions/src/components/CommentsPanel.tsx packages/discussions/src/components/CommentsPanel.module.css
git commit -m "feat(payload-discussions): add CommentsPanel with scroll area"
```

---

### Task 8: Rewire Discussions.tsx and delete old files

**Files:**
- Modify: `packages/discussions/src/components/Discussions.tsx`
- Delete: `packages/discussions/src/components/CommentForm.tsx`
- Delete: `packages/discussions/src/components/CommentForm.module.css`
- Delete: `packages/discussions/src/components/CommentItem.tsx`
- Delete: `packages/discussions/src/components/CommentItem.module.css`
- Delete: `packages/discussions/src/components/CommentList.tsx`
- Delete: `packages/discussions/src/components/CommentList.module.css`

**Step 1: Rewrite Discussions.tsx**

Replace the entire contents of `Discussions.tsx` with:

```tsx
'use client'

import type { DocumentReference } from '@repo/common'
import type { PopulatedComment } from '../types'
import { CommentProvider } from './CommentProvider'
import { CommentsPanel } from './CommentsPanel'
import styles from './Discussions.module.css'

interface DiscussionsClientProps {
  readonly initialComments: PopulatedComment[]
  readonly documentReference: DocumentReference
  readonly maxDepth: number
}

export function DiscussionsClient({
  initialComments,
  documentReference,
  maxDepth,
}: DiscussionsClientProps) {
  return (
    <div className={styles.root}>
      <CommentProvider
        documentReference={documentReference}
        initialComments={initialComments}
        maxDepth={maxDepth}
      >
        <CommentsPanel />
      </CommentProvider>
    </div>
  )
}
```

**Step 2: Delete old component files**

```bash
rm packages/discussions/src/components/CommentForm.tsx
rm packages/discussions/src/components/CommentForm.module.css
rm packages/discussions/src/components/CommentItem.tsx
rm packages/discussions/src/components/CommentItem.module.css
rm packages/discussions/src/components/CommentList.tsx
rm packages/discussions/src/components/CommentList.module.css
```

**Step 3: Commit**

```bash
git add -A packages/discussions/src/components/
git commit -m "refactor(payload-discussions): rewire DiscussionsClient and remove old components"
```

---

### Task 9: Update CommentContext to include comments

**Files:**
- Modify: `packages/discussions/src/components/CommentContext.ts`

**Step 1: Add comments to context value**

Update the `CommentContextValue` interface to include:

```ts
readonly comments: readonly PopulatedComment[]
```

And add the import for `PopulatedComment` from `../types`.

Full updated file:

```ts
'use client'

import { createContext, useContext } from 'react'
import type { PopulatedComment } from '../types'

export interface CommentContextValue {
  readonly comments: readonly PopulatedComment[]
  readonly activeReplyId: string | null
  readonly maxDepth: number
  readonly openReply: (id: string) => void
  readonly closeReply: () => void
  readonly submitReply: (parentId: string | null, content: string) => void
}

export const CommentContext = createContext<CommentContextValue | null>(null)

export function useCommentContext(): CommentContextValue {
  const ctx = useContext(CommentContext)
  if (!ctx) throw new Error('Comment components must be used within <CommentProvider>')
  return ctx
}
```

**Step 2: Commit**

```bash
git add packages/discussions/src/components/CommentContext.ts
git commit -m "feat(payload-discussions): expose comments in CommentContext"
```

Note: This task should be done alongside Task 2 or merged into it. It is listed separately for clarity but the implementer should include `comments` in the context from the start.

---

### Task 10: Type-check and verify

**Step 1: Run type check**

```bash
cd /Users/jarvis/Code/payload-plugins && pnpm --filter payload-discussions check:types
```

Expected: No type errors.

**Step 2: Run lint**

```bash
cd /Users/jarvis/Code/payload-plugins && pnpm --filter payload-discussions lint
```

Expected: No lint errors. If there are auto-fixable ones:
```bash
cd /Users/jarvis/Code/payload-plugins && pnpm --filter payload-discussions lint:fix
```

**Step 3: Run build**

```bash
cd /Users/jarvis/Code/payload-plugins && pnpm --filter payload-discussions build
```

Expected: Build succeeds, `dist/` is generated.

**Step 4: Commit any fixes**

```bash
git add packages/discussions/
git commit -m "fix(payload-discussions): resolve type and lint issues from refactor"
```

---

### Task 11: Manual smoke test

**Step 1: Start the sandbox dev server**

```bash
cd /Users/jarvis/Code/payload-plugins && pnpm dev --filter sandbox
```

**Step 2: Verify in browser**

Open the sandbox admin panel. Navigate to a document with the discussions field. Verify:

1. Top-level comment composer renders with auto-growing textarea
2. Submitting a comment prepends it to the list
3. Clicking "Reply" opens an inline composer and closes any other open composer
4. Reply composer appears inside the thread indent, below existing replies
5. The parent card becomes sticky when replying
6. Submitting a reply adds it to the correct thread
7. "Cancel Reply" closes the composer
8. Reply count toggle works (e.g., "3 replies ↓/↑")
9. Replies at max depth do not show a Reply button
10. Timestamps show relative format (e.g., "2 hours ago")
11. Focusing the top-level composer dismisses any open reply composer
12. ScrollArea works when there are many comments
