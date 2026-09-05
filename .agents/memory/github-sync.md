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

GitHub workflow files require the connector's workflow-write authorization in addition to ordinary repository write access. Without it, Git-data refs that point to commits containing `.github/workflows` are rejected, even when ordinary branch and Contents API writes succeed.

**Why:** The repository's OAuth connection exposed `repo` access but rejected every ref update or new ref pointing at a workflow-containing commit.

**How to apply:** Confirm the GitHub connection includes workflow-write permission before attempting to publish a parity workflow; otherwise stop and request an authorized connection rather than retrying branch mutations.

The repeatable workspace check is `pnpm run github:parity`. It compares tracked
and unignored workspace files to the recursive GitHub tree by Git blob SHA and
does exact byte checks for the static HTML entrypoints.

**Why:** Branch or commit metadata can look correct while a file is missing,
stale, or altered by transport encoding.

**How to apply:** Run the parity command after every sync and treat any
missing, extra, mismatched, unreadable, unsupported, or failed entrypoint
report as an incomplete sync.
