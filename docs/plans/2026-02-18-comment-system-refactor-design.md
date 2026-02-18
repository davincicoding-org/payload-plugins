# Comment System Refactor — Design

## Summary

Refactor the discussions plugin comment components from a flat prop-drilling
architecture to a context-coordinated component tree. Introduces single-reply
enforcement, sticky parent cards, collapsible threads, and relative timestamps.

## Architecture

```
Discussions.tsx (server — data fetch, unchanged)
  └─ DiscussionsClient.tsx (wraps in CommentProvider)
       └─ CommentProvider (owns state, API calls, context)
            └─ CommentsPanel (scroll area + top-level composer)
                 ├─ CommentComposer (new top-level comment)
                 └─ CommentThread[] (recursive)
                      ├─ CommentCard (display + action row)
                      ├─ Collapsible reply list
                      │    └─ CommentThread[] (nested)
                      └─ CommentComposer (inline reply)
```

## Component Mapping

| Current | New | Notes |
|---|---|---|
| CommentForm | CommentComposer | `react-textarea-autosize`, `@payloadcms/ui` Button |
| CommentItem | CommentCard + CommentThread | Card = pure display; Thread = recursive orchestrator |
| CommentList | CommentsPanel | `@base-ui/react/scroll-area` |
| State in Discussions.tsx | CommentProvider | New — context + state + API calls |
| — | CommentContext | Context definition |

## Context Contract

```ts
type CommentContextValue = {
  activeReplyId: string | null
  maxDepth:      number
  openReply:     (id: string) => void
  closeReply:    () => void
  submitReply:   (parentId: string | null, content: string) => void
}
```

- Only one reply composer open at a time (enforced by context).
- `submitReply(null, content)` creates a top-level comment.
- `maxDepth` consumed by CommentThread to hide reply buttons at depth limit.

## Styling

CSS Modules using Payload's CSS custom properties:
`--theme-elevation-*`, `--theme-text`, etc.

## Dependencies

- **Install:** `react-textarea-autosize`
- **Already available:** `@base-ui/react` (collapsible, scroll-area),
  `@payloadcms/ui` (Button, formatTimeToNow, useTranslation)

## Key Behaviors

1. Single reply composer — context-enforced
2. Sticky CommentCard — `position: sticky; top: 0` when replying
3. Auto-expand on reply — opening reply composer expands the reply list
4. Relative timestamps — Payload's `formatTimeToNow`
5. Reply sorting — replies oldest-first; top-level newest-first

## Files

### Deleted
- CommentForm.tsx, CommentForm.module.css
- CommentItem.tsx, CommentItem.module.css
- CommentList.tsx, CommentList.module.css

### Created
- CommentContext.ts
- CommentProvider.tsx
- CommentComposer.tsx, CommentComposer.module.css
- CommentCard.tsx, CommentCard.module.css
- CommentThread.tsx, CommentThread.module.css
- CommentsPanel.tsx, CommentsPanel.module.css

### Modified
- Discussions.tsx — remove state/API logic, render CommentProvider > CommentsPanel
- package.json — add react-textarea-autosize
