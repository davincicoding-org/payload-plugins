---
paths:
  - "**/*.tsx"
---

# Performance

## Memoization

Use memoization deliberately, not by default. Profile first with React
DevTools Profiler.

- **`useMemo`** -- Expensive computations (sorting, filtering large lists).
- **`useCallback`** -- Stabilize function references passed to memoized
  children or used as hook dependencies.
- **`React.memo`** -- Skip re-renders when a component receives the same
  props but its parent re-renders frequently.

**When NOT to memoize**: simple components, primitive-only props, or
components that almost always receive new props. Memoization has its own
cost.

## Code Splitting

Split components that are behind navigation or conditionally rendered
(modals, tabs, below-the-fold sections) so the user does not pay the
download cost upfront. Do not lazy-load components on the primary entry
point — it adds a waterfall that makes initial render slower.

```tsx
const HeavyChart = lazy(() => import("./HeavyChart"));

<Suspense fallback={<ChartSkeleton />}>
  <HeavyChart data={data} />
</Suspense>
```

## Virtualization

Render only visible items in long lists. Use a virtualization library
such as `@tanstack/react-virtual` when a list exceeds a few hundred
items. Always set `overscan` to avoid visible blank space during fast
scrolling.
