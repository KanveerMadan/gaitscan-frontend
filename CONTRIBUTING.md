# Contributing

Thanks for helping. Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md). Security
problems go through private reporting ([SECURITY.md](SECURITY.md)), not public issues. Problems with
a measurement belong in the [backend repository](https://github.com/KanveerMadan/GaitScan/issues).

## Getting set up

Node 22.13+; see the README's "Local setup". `pre-commit install` runs ESLint and Prettier on every
commit (git ≥ 2.35).

## Workflow

- Open an issue first for anything larger than a small fix (templates: bug report, feature request).
- Branch from `main`; one logical change per PR; PRs merge only with green CI. `CODEOWNERS` requests
  the maintainer's review, and the PR template lists the checks.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat(history): …`, `fix(setup): …`,
  `test: …`, `docs: …`.
- Bug fixes and features start with a failing test, committed before the change; never weaken an
  existing test to make a change pass.
- Never commit videos, `.env` files or real people's data. Test data is mocked or synthetic.

## Checks (run by CI)

```bash
npm test               # Vitest
npm run e2e            # Playwright: main flow, phone width, axe in light and dark mode
npm run lint && npm run format:check && npm run typecheck
```

Under heavy machine load a few Vitest screen tests can time out; re-run before treating that as a
failure.

## API changes

The client is typed from the backend's contract. Copy the backend's `contracts/openapi.json` over the
one here, run `npm run gen:api`, and commit both; CI fails on drift.

## Wording and languages

The app describes **measurements**, never diagnoses, injury risk or treatment; the tests check the
banned-word list. Interface text lives in `src/i18n/en.js`; add the same key to `src/i18n/hi.js`
(the Hindi table is a reviewed-before-release draft) and a test keeps the two in step.
