# Git Workflow

## Commit Messages

Follow the Conventional Commits specification:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `style:` — formatting, no code change
- `refactor:` — code restructure without behavior change
- `test:` — adding or updating tests
- `chore:` — maintenance tasks

Format: `<type>(<optional-scope>): <description>`

Keep the subject line under 72 characters. Use the body for context when
the change is non-trivial.

## Branch Naming

Use the pattern: `<type>/<short-description>`

Examples:
- `feat/user-auth`
- `fix/login-redirect`
- `chore/update-deps`

## Pull Request Workflow

1. Create a feature branch from the default branch
2. Make small, focused commits
3. Write a clear PR description explaining *what* and *why*
4. Request review from at least one team member
5. Address review comments with fixup commits
6. Squash-merge to keep the main branch history clean
