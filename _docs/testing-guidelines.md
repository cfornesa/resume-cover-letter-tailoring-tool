# Testing guidelines

- Use the Node.js test runner for the project-level smoke suite.
- Run `pnpm test` before handing work to QA.
- Keep tests deterministic and independent from network services.
- Add focused tests next to the behavior they cover as features are implemented.
- Do not add a test dependency without updating the relevant package manifest and asking first.