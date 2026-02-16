---
paths:
  - "**/*.tsx"
---

# Error Boundaries

## Placement

Wrap error boundaries at route or feature boundaries, not around every
component. This balances granularity with maintainability.

```tsx
<ErrorBoundary fallback={<ErrorFallback />} onError={reportToSentry}>
  <Dashboard />
</ErrorBoundary>
```

## Reset Strategies

- **Try again button** -- Reset the boundary's `hasError` state.
- **Reset on navigation** -- Key the boundary on `location.pathname` so
  it resets automatically when the user navigates away and back.

```tsx
<ErrorBoundary key={location.pathname}>
  <Outlet />
</ErrorBoundary>
```
