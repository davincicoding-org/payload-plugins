---
paths:
  - "**/*.{ts,tsx}"
---

# Custom Hooks

## Rules of Hooks

1. Only call hooks at the top level -- never inside loops, conditions, or
   nested functions.
2. Only call hooks from React function components or other custom hooks.
3. Prefix custom hooks with `use` so React enforces the rules.
4. Keep each hook focused on a single concern.

## Common Patterns

Extract reusable logic into custom hooks rather than duplicating state
and effect patterns across components.

- **useDebounce** -- Delay updating a value until input settles.
- **useLocalStorage** -- Sync state with `localStorage`, with JSON
  serialization and a lazy initializer.
- **useToggle** -- Simple boolean toggle with a stable callback.

```tsx
const debouncedQuery = useDebounce(query, 300);
const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
const [isOpen, toggleOpen] = useToggle();
```
