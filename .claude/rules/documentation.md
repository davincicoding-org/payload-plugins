# Documentation

Guidelines for writing useful comments and documentation in code.

## Public APIs

- Every public function, class, or module should have a doc comment
  explaining what it does and any non-obvious behavior or side effects.
  Types already communicate parameters and return values — do not
  repeat what the signature says. Self-descriptive exports where the
  name and type signature already communicate everything (e.g., thin
  query wrappers, config objects, simple type aliases) do not need
  doc comments.

## Comments

- **Explain why, not what** — Comments should capture reasoning behind
  non-obvious decisions, not restate what the code already says.
- **Remove dead code** — Commented-out code is dead weight. Version control
  keeps history. Delete it.
