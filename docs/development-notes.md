# Development Notes

## Tooling

### Husky

Husky is used to run Git hooks automatically during the commit workflow.

Current hooks:
- `commit-msg`: runs commitlint to validate commit message format
- `pre-commit`: currently runs `npm test`

Purpose:
- Enforce consistent commit conventions
- Prevent invalid commits from entering the repository
- Prepare the project for scalable team workflows and CI/CD

Setup:
- Installed as a dev dependency
- Activated via the `prepare` script in `package.json`
- Hooks stored in `.husky/`

---

### Commitlint

Commitlint validates commit messages against the Conventional Commits specification.

Example valid commits:

```txt
feat: add flight interpolation
fix: prevent map flickering
chore: configure husky
```

Purpose:
- Maintain clean Git history
- Improve readability of commits
- Support future changelog/release automation

Configuration:
- `commitlint.config.js`
- Uses `@commitlint/config-conventional`