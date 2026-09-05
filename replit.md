# Resume & Cover Letter Tailoring Tool

An application skeleton for tailoring resumes and cover letters to job descriptions with a React frontend and stateless Node.js backend.

## Run & Operate

- Canonical GitHub repository: https://github.com/cfornesa/resume-cover-letter-tailoring-tool
- `pnpm test` — run the Node.js smoke-test suite
- `pnpm run github:parity` — compare unignored workspace files with the canonical GitHub branch
- `pnpm run github:parity:ci` — run the same check against the GitHub Actions revision
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/resume-tailoring run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string for the shared workspace backend

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/resume-tailoring` — React/Vite frontend
- `artifacts/api-server` — Node.js/Express backend
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `_docs` — workflow, testing, design, and task documentation

## Architecture decisions

- The project uses pnpm workspaces and TypeScript throughout the application.
- The frontend is client-heavy; future user data belongs in browser storage, not a server database.
- The backend remains stateless and is reserved for transient provider requests.
- The initial build is intentionally a skeleton; product behavior is implemented one groomed GitHub issue at a time.

## Product

The planned product helps users tailor resumes and cover letters to a job description, analyze ATS keyword gaps, and export generated documents.

## User preferences

- Use Node.js for the frontend and backend; do not introduce Python tooling.
- Use pnpm workspace commands for dependency installation and scripts.

## Gotchas

- Do not implement backlog behavior before the corresponding GitHub issue has been groomed.
- Read `_docs/testing-guidelines.md` before writing tests and `_docs/design-system.md` before changing UI.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## GitHub parity enforcement

The `GitHub parity` Actions workflow runs `pnpm run github:parity:ci` on every
push and pull request targeting `main`. It compares the checked-out revision
with that exact GitHub revision, including the recursive tree and the static
HTML entrypoints. Its `GitHub parity` job is a required status check for
`main`, so a pull request cannot merge while parity is failing or absent.

When working in Replit or completing a supported repository sync, run the local
check before declaring the sync complete:

```sh
pnpm run github:parity
```

Local runs use the installed GitHub integration, while CI uses GitHub's
short-lived Actions token. Neither mode requires a token argument or prints
credentials. The check compares every tracked or unignored workspace file
with the recursive GitHub tree, calculates Git blob SHAs from the current file
bytes, and reports missing, extra, unreadable, and stale paths. It also fetches
the two static HTML entrypoints through the Contents API and performs an exact
byte comparison after safely removing base64 whitespace.

Useful overrides:

```sh
pnpm run github:parity -- --ref feature/my-branch
pnpm run github:parity -- --repo owner/repository --entrypoint path/to/index.html
```

The command exits nonzero whenever parity cannot be established or any
reported path/entrypoint differs. A failed local check or Actions job means
the sync is incomplete: use each reported path to identify the missing or
stale file, finish or retry the supported sync, and rerun
`pnpm run github:parity` locally. For a failed pull request gate, push the
correction and the workflow will rerun automatically. A successful branch push
alone is not proof of parity.
