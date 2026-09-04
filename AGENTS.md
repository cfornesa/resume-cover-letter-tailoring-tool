Commands

- `pnpm install` - install dependencies
- `pnpm test` - the whole suite
- `pnpm test -- tests/test-home.test.mjs` - one test file
- `pnpm run typecheck` - check the TypeScript workspace

Rules

- Dependencies are added in `package.json` or the relevant package's `package.json`. Do not add one without asking

Documents

- `_docs/process.md` - how work is organized
- Before writing tests, read `_docs/testing-guidelines.md`
- For anything touching the UI, read `_docs/design-system.md`