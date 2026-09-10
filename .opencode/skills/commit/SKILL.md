---
name: commit
description: Use when the user asks to commit changes, create a git commit, or wants to save current work to version control. Triggers on keywords like "commit", "save changes", "check in", "push changes".
---

# Commit

Workflow for creating clean, well-described git commits.

## Steps

### 1. Collect changed files
Run `git status` to see all changed and untracked files.

### 2. Review the diff
Run `git diff` and `git diff --staged` to review all changes in detail.

### 3. Check code quality (pre-commit)

Before staging, scan the diff for code quality issues. Report each issue and ask the user whether to fix it or proceed.

**Dead code:**
- Unused imports
- Variables or functions defined but never referenced
- Commented-out code blocks
- Unreachable code after return/throw
- Empty catch/except blocks that swallow errors silently

**Unclean code:**
- `console.log` or `debugger` statements left in
- Hardcoded URLs, secrets, or credentials (not in `.env` or config)
- TODO/FIXME/HACK comments without linked issue
- Duplicate logic that should be extracted
- Inconsistent naming conventions vs surrounding code
- Missing error handling on async operations
- `any` type in TypeScript files

For each issue found:
1. List it clearly with file path and line number
2. Ask the user: "Fix before commit? (y/n)"
3. If yes, fix it. If no, proceed.

### 4. Run tests and verify coverage

Run the project's test suite:

```bash
# Frontend (Node test runner with coverage)
cd client && node --test --experimental-test-coverage src/**/*.test.js

# If using vitest
cd client && npx vitest run --coverage

# Backend (if pytest is configured)
cd backend-fastapi && python -m pytest --cov=. --cov-report=term-missing
```

**Requirements:**
- All tests must pass (zero failures)
- Code coverage must be **100%** for files changed in this commit
- If tests fail or coverage is below 100%, report the gaps and ask the user to fix before committing

### 5. Keep BUILD.md in sync

Before committing, make sure `BUILD.md` at the repo root reflects the current change: every feature, fix, test, or tooling change gets a new numbered entry (or an amendment to an existing one), and the "Current stack" / "Common commands" sections are updated if the stack or commands changed. Stale entries relative to this commit's diff are a blocker for the commit.

### 6. Write the commit message

Run `git log --oneline -5` to understand recent commit message style, then write a concise message that:
- Uses the imperative mood ("Add feature" not "Added feature")
- First line is under 72 characters
- Describes the *what* and *why*, not the *how*
- Groups related changes logically

### 7. Stage and commit

Stage the intended files with `git add` and commit with `git commit -m "message"`.

### 8. Confirm

Return the commit hash and summary to the user.

## Rules

- Never commit secrets, keys, passwords, or tokens.
- Never commit `.env` files unless they are template/example files.
- Always inspect `git diff` before staging to catch unintended changes.
- If the diff is large, split into multiple logical commits.
- Match the existing commit message style of the repository.
- If the user declines to fix code quality issues, note them in the commit message as known debt.
- Never commit a code change without an accompanying `BUILD.md` update (see step 5).
