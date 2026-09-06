---
name: commit
description: Use when the user asks to commit changes, create a git commit, or wants to save current work to version control. Triggers on keywords like "commit", "save changes", "check in", "push changes".
---

# Commit

Workflow for creating clean, well-described git commits.

## Steps

1. Run `git status` to see all changed and untracked files.
2. Run `git diff` and `git diff --staged` to review all changes in detail.
3. Run `git log --oneline -5` to understand recent commit message style.
4. Analyze the diff to understand what changed and why.
5. Write a concise commit message that:
   - Uses the imperative mood ("Add feature" not "Added feature")
   - First line is under 72 characters
   - Describes the *what* and *why*, not the *how*
   - Groups related changes logically
6. Stage the intended files with `git add`.
7. Commit with `git commit -m "message"`.
8. Return the commit hash and summary to the user.

## Rules

- Never commit secrets, keys, passwords, or tokens.
- Never commit `.env` files unless they are template/example files.
- Always inspect `git diff` before staging to catch unintended changes.
- If the diff is large, split into multiple logical commits.
- Match the existing commit message style of the repository.
