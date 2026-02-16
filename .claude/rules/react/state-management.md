---
paths:
  - "**/*.tsx"
---

# State Management

## When to Use What

| Scope | Solution | Example |
|-------|----------|---------|
| Single component | `useState` | Form input, toggle |
| Complex local logic | `useReducer` | Multi-field form, wizard steps |
| Subtree of components | Context + `useReducer` | Theme, auth status |
| Global app state | Zustand, Jotai, or Redux | Shopping cart, notifications |
| Server state | React Query, SWR | API data, caching |

## Lifting State

Lift state to the nearest common ancestor when siblings need to share or
coordinate on the same value. If lifting causes prop drilling beyond two
or three levels, introduce Context or a state library instead.
