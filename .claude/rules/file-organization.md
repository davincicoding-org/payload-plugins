# File Organization

Guidelines for structuring code into files and modules.

## File Size and Focus

- **Small, focused files** — Target 300 lines per file. If a file exceeds
  that limit, look for opportunities to split it.
- **One concern per file** — Each file should have one clear responsibility.
  Avoid catch-all files named helpers or utils that accumulate unrelated logic.
- **Group by feature** — For larger projects, prefer feature-based directory
  organization over type-based. Keep related code together so understanding
  or modifying a feature does not require jumping across distant directories.

## Code Smells

Watch for these anti-patterns and refactor when you spot them:

- **Long functions (over 50 lines)** — A function this long is likely doing
  too much. Break it into smaller, well-named functions that each handle one
  step. Cohesive sequential logic (e.g., multi-phase animations, pipeline
  transforms) that handles one responsibility may exceed this limit.
- **Deep nesting (more than 3 levels)** — Use early returns and guard clauses
  to flatten deeply nested conditionals.
- **Magic numbers and strings** — Replace unexplained literal values in
  logic with named constants that communicate intent. Literal values in
  declarative config objects (e.g., image dimensions, sample rates) are
  acceptable when the surrounding structure already communicates meaning.
- **Boolean parameters that change behavior** — A boolean flag that makes a
  function do two different things is a sign it should be two separate
  functions with clear names. Boolean props that toggle a style variant
  (e.g., `isCompact`, `bordered`) are not code smells.
- **God objects or modules** — A class or module that knows about everything
  and does everything is a maintenance nightmare. Split by responsibility.
