# Resume & Cover Letter Tailoring Tool

An application skeleton for tailoring resumes and cover letters to job descriptions with a React frontend and stateless Node.js backend.

## Run & Operate

- Canonical GitHub repository: https://github.com/cfornesa/resume-cover-letter-tailoring-tool
- `pnpm test` — run the Node.js smoke-test suite
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
