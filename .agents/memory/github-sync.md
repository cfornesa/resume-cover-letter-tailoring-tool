---
name: GitHub sync constraints
description: Environment-specific constraints when syncing this project to its GitHub repository.
---

The GitHub connector can read and write repository contents, but the normal Git HTTPS remote does not receive credentials in this environment. GitHub Git-data bulk writes may also be blocked by the connector proxy's Cloudflare protection; do not claim a full push succeeded without verifying the remote tree.

**Why:** A configured GitHub remote is not sufficient evidence that the repository contains the current workspace; verify the remote branch and commit contents separately.

**How to apply:** Prefer the attached GitHub integration for repository operations, keep the canonical remote documented in project instructions, and report any incomplete sync precisely.