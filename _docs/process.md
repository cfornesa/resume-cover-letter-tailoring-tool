- Tasks are GitHub issues, one at a time
- Read the acceptance criteria before starting and before closing
- Commit regularly

## Merge policy

- Pull requests targeting `main` must pass the required `GitHub parity` status
  check before they can merge.
- A failing or missing parity check blocks the merge, ensuring the checked-out
  revision and the GitHub repository contents remain synchronized.

Roles

- PM - grooms a task before anyone implements it, follows `_docs/team/pm.md`
- Engineer - implements one groomed task, follows `_docs/team/software-engineer.md`
- QA - checks the result against the acceptance criteria, follows `_docs/team/qa-engineer.md`