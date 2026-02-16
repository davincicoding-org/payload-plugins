# Coding Standards

Universal coding standards for quality, maintainability, and consistency.

## Core Principles

- **Readability first** — Code is read far more than it is written. Clear
  names and self-documenting structure beat terse cleverness.
- **KISS** — Choose the simplest solution that works. Avoid over-engineering
  and premature abstraction. Easy to understand beats clever.
- **DRY** — Extract common logic into reusable functions or modules. If you
  copy something twice, extract it.
- **YAGNI** — Do not build features before they are needed. Add complexity
  only when current requirements demand it. Start simple, refactor when the
  need is real.

## Naming Conventions

- **Variables** — Use descriptive nouns that reveal intent. Avoid single
  letters and abbreviations unless the scope is trivially small (loop
  counters, lambda parameters).
- **Functions** — Use verb-noun pairs that describe the action: fetch, create,
  calculate, validate, parse, format. Internal callbacks and short-lived
  closures may use simpler names when the scope makes intent obvious.
- **Domain-idiomatic names** — When a domain has an established vocabulary
  (math, a framework ecosystem, a protocol), prefer the domain convention
  over general naming rules. `x`/`y` for coordinates, `cn` for class name
  merging, `ctx` for context, and `db` for database connections are clearer
  to practitioners than verbose alternatives.
- **Framework-mandated names** — These rules apply to names you control.
  Names dictated by a framework or library API (export names, hook
  signatures, convention-based file names) are exempt.
- **Booleans** — Prefix with is, has, can, should, or was so their true/false
  nature is immediately obvious.
- **Constants** — Use all-uppercase with word separators to distinguish from
  regular variables.
- **Consistency** — Pick one naming convention per project and stick with it.
  Never mix conventions within the same directory.

## Immutability

- Prefer creating new data structures over mutating existing ones.
  Immutability reduces bugs from unexpected side effects and makes code
  easier to reason about.
- When mutation is acceptable: building up a local structure within a single
  function before returning it, or performance-critical hot paths where
  profiling proves immutability is the bottleneck.
- When you do mutate intentionally, add a comment explaining why —
  except for standard patterns where mutation is inherent (e.g., `reduce`
  accumulators, builder patterns).

## Error Handling

- **Handle errors at boundaries** — Catch and handle at system boundaries
  (API endpoints, CLI entry points, event handlers) rather than deep inside
  business logic. Let errors propagate up naturally.
- **Provide context** — Error messages should include what failed and why.
  Generic messages like "something went wrong" help no one.
- **Fail explicitly** — Never silently swallow errors or return misleading
  defaults. Make failures visible so problems surface immediately.
- **Validate inputs early** — Validate at the boundary of your system, then
  trust the data internally. Do not scatter validation checks throughout
  business logic.
