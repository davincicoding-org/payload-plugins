# Testing Standards

## Coverage Target

Aim for 80% code coverage on all new and modified code. Focus coverage
on business logic and critical paths rather than boilerplate.

## Test Types

- **Unit tests** — Isolate individual functions and modules. Mock external
  dependencies. These should be fast and numerous.
- **Integration tests** — Verify that modules work together correctly.
  Use real dependencies where practical.
- **End-to-end tests** — Cover critical user workflows. Keep these
  focused and stable.

## Arrange-Act-Assert (AAA) Pattern

Structure every test in three phases:

1. **Arrange** — Set up test data, mocks, and preconditions
2. **Act** — Execute the code under test
3. **Assert** — Verify the outcome matches expectations

## Naming

Use descriptive test names that explain the scenario and expected outcome:
`should return 404 when user is not found`

## Best Practices

- Each test should verify one behavior
- Tests must be independent and order-insensitive
- Avoid testing implementation details; test behavior
- Clean up side effects (database records, files, etc.)
- Use factories or fixtures for test data, not hard-coded values
