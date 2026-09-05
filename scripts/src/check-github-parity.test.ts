import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { test } from "node:test";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import type { ReplitConnectors } from "@replit/connectors-sdk";
import {
  checkEntrypoint,
  compareSnapshots,
  createGithubClient,
  decodeBase64Content,
  formatGithubSummary,
  githubParityExitCode,
  gitBlobSha,
  publishGithubSummary,
  snapshotRemote,
  type GithubClient,
  type RemoteSnapshot,
  type WorkspaceSnapshot,
} from "./check-github-parity.js";

const repository = { owner: "owner", name: "repository" };

function connectorFor(response: {
  ok: boolean;
  status?: number;
  statusText?: string;
  body: unknown;
}): ReplitConnectors {
  return {
    proxy: async () => ({
      ok: response.ok,
      status: response.status ?? 200,
      statusText: response.statusText ?? "OK",
      json: async () => response.body,
    }),
  } as unknown as ReplitConnectors;
}

test("selects the local connector outside Actions and the fetch client in Actions", async () => {
  const localCalls: unknown[][] = [];
  const localClient: GithubClient = {
    proxy: async (...args) => {
      localCalls.push(args);
      return new Response("{}", { status: 200 });
    },
  };
  const localSelected = createGithubClient(
    { GITHUB_ACTIONS: "false", GITHUB_TOKEN: "ci-token" },
    { localClient },
  );

  assert.equal(localSelected, localClient);
  await localSelected.proxy("github", "/local");
  assert.deepEqual(localCalls, [["github", "/local"]]);

  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const actionsSelected = createGithubClient(
    { GITHUB_ACTIONS: "true", GITHUB_TOKEN: " ci-token " },
    {
      localClient,
      fetchImplementation: async (input, init) => {
        requests.push({ input: String(input), init });
        return new Response("{}", { status: 200 });
      },
    },
  );

  assert.notEqual(actionsSelected, localClient);
  await actionsSelected.proxy("github", "/ci");
  assert.equal(requests.length, 1);
});

test("sends only GitHub API headers plus the short-lived CI bearer token", async () => {
  let request: { input: string; init?: RequestInit } | undefined;
  const client = createGithubClient(
    { GITHUB_ACTIONS: "true", GITHUB_TOKEN: "ci-token" },
    {
      fetchImplementation: async (input, init) => {
        request = { input: String(input), init };
        return new Response("{}", { status: 200 });
      },
    },
  );

  await client.proxy("github", "/repos/owner/repository/git/trees/main");

  assert.deepEqual(request, {
    input: "https://api.github.com/repos/owner/repository/git/trees/main",
    init: {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: "Bearer ci-token",
      },
    },
  });
});

test("missing CI credentials fail with a nonzero result without leaking credentials", () => {
  const scriptsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const parityScript = resolve(scriptsRoot, "src/check-github-parity.ts");
  const result = spawnSync("pnpm", ["exec", "tsx", parityScript], {
    cwd: scriptsRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_ACTIONS: "true",
      GITHUB_TOKEN: "",
    },
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 2);
  assert.match(
    output,
    /GITHUB_TOKEN is required when parity runs in GitHub Actions/,
  );
  assert.doesNotMatch(output, /Bearer|Authorization|ci-token/);
});

function workspaceSnapshot(
  entries: Array<[string, string]>,
): WorkspaceSnapshot {
  return {
    files: new Map(
      entries.map(([path, sha]) => [path, { bytes: Buffer.from(path), sha }]),
    ),
    unreadable: new Map(),
  };
}

test("compares missing, extra, and mismatched paths", () => {
  const workspace = workspaceSnapshot([
    ["same.txt", "same-sha"],
    ["local-only.txt", "local-sha"],
    ["changed.txt", "local-changed-sha"],
  ]);
  const remote: RemoteSnapshot = {
    files: new Map([
      ["same.txt", "same-sha"],
      ["changed.txt", "remote-changed-sha"],
      ["remote-only.txt", "remote-sha"],
    ]),
    unsupported: [],
  };

  assert.deepEqual(compareSnapshots(workspace, remote), {
    missingOnGitHub: ["local-only.txt"],
    extraOnGitHub: ["remote-only.txt"],
    mismatched: ["changed.txt"],
  });
});

test("formats every drift category as a path-only Actions summary", () => {
  const summary = formatGithubSummary({
    missingOnGitHub: ["local-only.txt"],
    extraOnGitHub: ["remote-only.txt"],
    mismatched: ["changed.txt"],
    unreadable: ["unreadable.txt"],
    unsupported: ["submodule"],
    byteCheckFailures: ["artifacts/index.html"],
  });

  assert.match(summary, /\*\*Result: failed\*\*/);
  assert.match(summary, /### Missing on GitHub \(1\)/);
  assert.match(summary, /### Extra in GitHub \(1\)/);
  assert.match(summary, /### Mismatched Git blob SHAs \(1\)/);
  assert.match(summary, /### Unreadable workspace paths \(1\)/);
  assert.match(summary, /### Unsupported GitHub tree entries \(1\)/);
  assert.match(summary, /### Byte-check failures \(1\)/);
  assert.match(summary, /`local-only\.txt`/);
  assert.match(summary, /`artifacts\/index\.html`/);
  assert.doesNotMatch(summary, /Bearer|Authorization|ci-token|X-GitHub-Api-Version/);
});

test("publishes a failed summary without changing the parity failure status", async () => {
  const report = {
    missingOnGitHub: ["local-only.txt"],
    extraOnGitHub: ["remote-only.txt"],
    mismatched: ["changed.txt"],
    unreadable: ["unreadable.txt"],
    unsupported: ["submodule"],
    byteCheckFailures: ["artifacts/index.html"],
  };
  const summaryDirectory = await mkdtemp(join(tmpdir(), "github-parity-"));
  const summaryFile = join(summaryDirectory, "summary.md");

  try {
    const statusBeforePublishing = githubParityExitCode(report);
    await assert.doesNotReject(() =>
      publishGithubSummary(summaryFile, formatGithubSummary(report)),
    );
    const publishedSummary = await readFile(summaryFile, "utf8");

    assert.equal(statusBeforePublishing, 1);
    assert.equal(githubParityExitCode(report), 1);
    assert.match(publishedSummary, /\*\*Result: failed\*\*/);
    assert.match(publishedSummary, /### Missing on GitHub \(1\)/);
    assert.match(publishedSummary, /### Extra in GitHub \(1\)/);
    assert.match(publishedSummary, /### Mismatched Git blob SHAs \(1\)/);
    assert.match(publishedSummary, /### Unreadable workspace paths \(1\)/);
    assert.match(publishedSummary, /### Unsupported GitHub tree entries \(1\)/);
    assert.match(publishedSummary, /### Byte-check failures \(1\)/);
    assert.match(publishedSummary, /`local-only\.txt`/);
    assert.match(publishedSummary, /`remote-only\.txt`/);
    assert.match(publishedSummary, /`changed\.txt`/);
    assert.match(publishedSummary, /`unreadable\.txt`/);
    assert.match(publishedSummary, /`submodule`/);
    assert.match(publishedSummary, /`artifacts\/index\.html`/);
    assert.doesNotMatch(
      publishedSummary,
      /Bearer|Authorization|ci-token|X-GitHub-Api-Version/,
    );
  } finally {
    await rm(summaryDirectory, { recursive: true, force: true });
  }
});

test("publishes a passing summary without changing the parity success status", async () => {
  const report = {
    missingOnGitHub: [],
    extraOnGitHub: [],
    mismatched: [],
    unreadable: [],
    unsupported: [],
    byteCheckFailures: [],
  };
  const summaryDirectory = await mkdtemp(join(tmpdir(), "github-parity-"));
  const summaryFile = join(summaryDirectory, "summary.md");

  try {
    const statusBeforePublishing = githubParityExitCode(report);
    await assert.doesNotReject(() =>
      publishGithubSummary(summaryFile, formatGithubSummary(report)),
    );
    const publishedSummary = await readFile(summaryFile, "utf8");

    assert.equal(statusBeforePublishing, 0);
    assert.equal(githubParityExitCode(report), 0);
    assert.match(publishedSummary, /\*\*Result: passed\*\*/);
    assert.match(
      publishedSummary,
      /### Missing on GitHub\n\n_None\._/,
    );
    assert.match(publishedSummary, /### Extra in GitHub\n\n_None\._/);
    assert.match(
      publishedSummary,
      /### Mismatched Git blob SHAs\n\n_None\._/,
    );
    assert.match(
      publishedSummary,
      /### Unreadable workspace paths\n\n_None\._/,
    );
    assert.match(
      publishedSummary,
      /### Unsupported GitHub tree entries\n\n_None\._/,
    );
    assert.match(publishedSummary, /### Byte-check failures\n\n_None\._/);
  } finally {
    await rm(summaryDirectory, { recursive: true, force: true });
  }
});

test("calculates the Git blob SHA with the blob header", () => {
  assert.equal(
    gitBlobSha(Buffer.from("hello\n")),
    "ce013625030ba8dba906f756967f9e9ca394464a",
  );
});

test("decodes base64 content containing embedded whitespace", () => {
  const content = "bGluZSBv\nbmUK\tbGluZSB0d28=";

  assert.deepEqual(
    decodeBase64Content(content),
    Buffer.from("line one\nline two"),
  );
});

test("rejects malformed base64 content", () => {
  assert.throws(
    () => decodeBase64Content("%%% definitely not base64 %%%"),
    /GitHub returned invalid base64 content/,
  );
});

test("checks an entrypoint using base64 content with embedded whitespace", async () => {
  const bytes = Buffer.from("line one\nline two");
  const workspace: WorkspaceSnapshot = {
    files: new Map([["README.md", { bytes, sha: gitBlobSha(bytes) }]]),
    unreadable: new Map(),
  };
  const client = connectorFor({
    ok: true,
    body: {
      type: "file",
      encoding: "base64",
      content: "bGluZSBv\nbmUK\tbGluZSB0d28=",
    },
  });

  await assert.doesNotReject(async () => {
    const result = await checkEntrypoint(
      client,
      repository,
      "main",
      "README.md",
      workspace,
    );
    assert.deepEqual(result, {
      path: "README.md",
      ok: true,
      workspaceBytes: bytes.byteLength,
      remoteBytes: bytes.byteLength,
    });
  });
});

test("reports a truncated remote tree with an actionable failure", async () => {
  const client = connectorFor({
    ok: true,
    body: { truncated: true, tree: [] },
  });

  await assert.rejects(
    snapshotRemote(client, repository, "main"),
    /truncated recursive tree; parity cannot be established safely/,
  );
});

test("reports malformed remote tree responses with an actionable failure", async () => {
  const client = connectorFor({
    ok: true,
    body: { truncated: false, tree: "not-an-array" },
  });

  await assert.rejects(
    snapshotRemote(client, repository, "main"),
    /no recursive tree for the requested ref/,
  );
});

test("reports invalid remote JSON with the requested API path", async () => {
  const client = {
    proxy: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }),
  } as unknown as ReplitConnectors;

  await assert.rejects(
    snapshotRemote(client, repository, "main"),
    /invalid JSON response for \/repos\/owner\/repository\/git\/trees\/main\?recursive=1/,
  );
});

test("reports a tree entry without a valid path", async () => {
  const client = connectorFor({
    ok: true,
    body: { tree: [{ type: "blob", sha: "abc123" }] },
  });

  await assert.rejects(
    snapshotRemote(client, repository, "main"),
    /tree entry without a valid path/,
  );
});

test("returns an actionable failure for malformed remote file content", async () => {
  const bytes = Buffer.from("local content");
  const workspace: WorkspaceSnapshot = {
    files: new Map([["README.md", { bytes, sha: gitBlobSha(bytes) }]]),
    unreadable: new Map(),
  };
  const client = connectorFor({
    ok: true,
    body: {
      type: "file",
      encoding: "base64",
      content: "not valid base64!",
    },
  });

  const result = await checkEntrypoint(
    client,
    repository,
    "main",
    "README.md",
    workspace,
  );

  assert.equal(result.ok, false);
  assert.equal(result.path, "README.md");
  assert.match(result.error ?? "", /invalid base64 content/);
});

test("reports non-OK remote responses with the request path and status", async () => {
  const bytes = Buffer.from("local content");
  const workspace: WorkspaceSnapshot = {
    files: new Map([["README.md", { bytes, sha: gitBlobSha(bytes) }]]),
    unreadable: new Map(),
  };
  const client = connectorFor({
    ok: false,
    status: 503,
    statusText: "Service Unavailable",
    body: {},
  });

  const result = await checkEntrypoint(
    client,
    repository,
    "main",
    "README.md",
    workspace,
  );

  assert.equal(result.ok, false);
  assert.match(
    result.error ?? "",
    /GitHub API request failed for \/repos\/owner\/repository\/contents\/README\.md\?ref=main \(503 Service Unavailable\)/,
  );
});