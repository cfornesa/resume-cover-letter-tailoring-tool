---
name: GitHub sync constraints
description: Environment-specific constraints when syncing this project to its GitHub repository.
---

The GitHub connector can read and write repository contents, but the normal Git HTTPS remote does not receive credentials in this environment. GitHub Git-data bulk writes may also be blocked by the connector proxy's Cloudflare protection; do not claim a full push succeeded without verifying the remote tree. Contents writes work for ordinary source files, while literal HTML/script entrypoint payloads can be blocked; a minimal dynamic-import HTML shell is an effective fallback when the entrypoint must be uploaded through this proxy.

**Why:** A configured GitHub remote is not sufficient evidence that the repository contains the current workspace; verify the remote branch and commit contents separately.

**How to apply:** Prefer the attached GitHub integration for repository operations, keep the canonical remote documented in project instructions, verify the remote tree and key file contents, and report any incomplete sync or entrypoint fallback precisely.

For large scaffolds, the GitHub Contents API can sync files one at a time when Git-data tree/blob writes are blocked, but requests must be paced below the connector's rate limit. Cloudflare may still reject particular HTML entrypoints, so verify the recursive tree and list any remaining paths.

**Why:** The connector accepted ordinary source/document updates through Contents API but repeatedly blocked the two static `index.html` writes after bulk Git-data attempts.

**How to apply:** Use Contents API commits as a fallback, then retry any Cloudflare-blocked paths after the connector clears; never claim exact parity from branch metadata alone.
