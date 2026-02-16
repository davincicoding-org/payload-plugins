---
paths:
  - "**/*.tsx"
---

# Forms

## Controlled Components

Keep form inputs controlled with `useState` or `useReducer`. Validate on
submit and clear field-level errors on change for immediate feedback.

```tsx
<input
  id="email"
  value={formData.email}
  onChange={handleChange("email")}
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && <span id="email-error" role="alert">{errors.email}</span>}
```

Always associate labels with inputs via `htmlFor`/`id` and use
`aria-invalid` plus `aria-describedby` to surface errors to assistive
technology.

## Complex Forms

When forms grow beyond a few fields or need advanced validation, dynamic
fields, or multi-step flows, use React Hook Form or TanStack Form instead
of manual state management. These libraries handle validation, dirty
tracking, and performance out of the box.
