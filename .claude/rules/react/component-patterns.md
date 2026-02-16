---
paths:
  - "**/*.tsx"
---

# Component Patterns

## Documentation

Most components are self-descriptive — their name communicates the visual
role and their props type documents the API. These do not need doc
comments. Add doc comments only to components with non-obvious runtime
behavior: animations, side effects, external API calls, or complex
timing/sequencing logic.

## Named Exports

Prefer named exports over default exports for components. Named exports
are grep-friendly, work better with refactoring tools, and prevent
arbitrary renaming at the import site.

```tsx
// Prefer
export function Card({ title }: CardProps) { ... }

// Avoid
export default function Card({ title }: CardProps) { ... }
```

**Exception:** Use default exports where the framework requires them
(e.g., Next.js pages, layouts, loading, and error boundary files).

## Props Export

Every exported component that accepts props must also export its props
type. Define the props type above the component declaration.

Exception: components that only accept `children` with no additional
props can use `PropsWithChildren` directly without a named export.

```tsx
// Named props — export the type
export interface CardProps {
  readonly title: string;
  readonly children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return <div>{title}{children}</div>;
}

// Children only — no named type needed
export function Layout({ children }: PropsWithChildren) {
  return <main>{children}</main>;
}
```

## Composition Over Inheritance

Build UIs by composing small, focused components. Never use class
inheritance for component reuse. Each component should accept `children`
or specific props to allow flexible composition.

```tsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

## Compound Components

Share implicit state between related components using Context. This keeps
the public API clean while allowing components to coordinate internally.

```tsx
const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used within <Tabs>");
  return ctx;
}
```

Expose each sub-component as a named export so consumers compose them
freely: `<Tabs>`, `<TabList>`, `<Tab>`, `<TabPanel>`.
