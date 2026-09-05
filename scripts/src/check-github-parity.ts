import { createHash } from "node:crypto";
import { appendFile, lstat, readFile, readlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ReplitConnectors } from "@replit/connectors-sdk";

const DEFAULT_REPOSITORY = "cfornesa/resume-cover-letter-tailoring-tool";
const DEFAULT_REF = "main";
const DEFAULT_ENTRYPOINTS = [
  "artifacts/mockup-sandbox/index.html",
  "artifacts/resume-tailoring/index.html",
];
const GITHUB_CONNECTOR = "github";
const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

type TreeEntry = {
  path?: unknown;
  type?: unknown;
  sha?: unknown;
};

type TreeResponse = {
  truncated?: unknown;
  tree?: unknown;
};

type ContentResponse = {
  type?: unknown;
  encoding?: unknown;
  content?: unknown;
};

type Repository = {
  owner: string;
  name: string;
};

type Options = {
  repository: Repository;
  ref: string;
  entrypoints: string[];
  summaryPath?: string;
};

export type GithubClient = Pick<ReplitConnectors, "proxy">;

type GithubClientEnvironment = {
  GITHUB_ACTIONS?: string;
  GITHUB_TOKEN?: string;
};

type GithubClientDependencies = {
  localClient?: GithubClient;
  fetchImplementation?: typeof fetch;
};

export type WorkspaceFile = {
  bytes: Buffer;
  sha: string;
};

export type WorkspaceSnapshot = {
  files: Map<string, WorkspaceFile>;
  unreadable: Map<string, string>;
};

export type RemoteSnapshot = {
  files: Map<string, string>;
  unsupported: string[];
};

export type ByteCheck = {
  path: string;
  ok: boolean;
  workspaceBytes?: number;
  remoteBytes?: number;
  error?: string;
};

class UsageError extends Error {}

function usage(): string {
  return [
    "Usage: pnpm run github:parity [options]",
    "",
    "Compare the current unignored workspace files with the GitHub branch.",
    "",
    "Options:",
    `  --repo <owner/name>       Repository (default: ${DEFAULT_REPOSITORY})`,
    `  --ref <branch-or-sha>     GitHub ref (default: ${DEFAULT_REF})`,
    "  --entrypoint <path>       Exact byte-check path; may be repeated",
    "  --summary <path>          GitHub Actions step summary file",
    "  --help                    Show this help",
  ].join("\n");
}

function requireValue(argv: string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new UsageError(`${option} requires a value.\n\n${usage()}`);
  }
  return value;
}

function parseRepository(value: string): Repository {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(value);
  if (!match) {
    throw new UsageError(
      `Invalid repository "${value}". Use the owner/name form.\n\n${usage()}`,
    );
  }
  return { owner: match[1], name: match[2] };
}

function normalizeRepositoryPath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => part === "..")
  ) {
    throw new UsageError(`Invalid repository path "${value}".`);
  }
  return normalized;
}

function parseOptions(argv: string[]): Options | null {
  let repository = parseRepository(DEFAULT_REPOSITORY);
  let ref = DEFAULT_REF;
  const entrypoints: string[] = [];
  let summaryPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--help":
      case "-h":
        return null;
      case "--repo":
        repository = parseRepository(requireValue(argv, index, "--repo"));
        index += 1;
        break;
      case "--ref":
        ref = requireValue(argv, index, "--ref");
        index += 1;
        break;
      case "--entrypoint":
        entrypoints.push(
          normalizeRepositoryPath(requireValue(argv, index, "--entrypoint")),
        );
        index += 1;
        break;
      case "--summary":
        summaryPath = requireValue(argv, index, "--summary");
        index += 1;
        break;
      default:
        throw new UsageError(`Unknown option "${argument}".\n\n${usage()}`);
    }
  }

  if (!ref.trim()) {
    throw new UsageError(`--ref cannot be empty.\n\n${usage()}`);
  }

  return {
    repository,
    ref,
    entrypoints: entrypoints.length > 0 ? entrypoints : DEFAULT_ENTRYPOINTS,
    summaryPath,
  };
}

function runGit(args: string[], cwd: string): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`Unable to run git: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim().replaceAll(/\s+/g, " ");
    throw new Error(`git ${args[0]} failed${detail ? `: ${detail}` : "."}`);
  }
  return result.stdout;
}

function findRepositoryRoot(): string {
  return runGit(["rev-parse", "--show-toplevel"], process.cwd()).trim();
}

function trackedAndUnignoredPaths(repositoryRoot: string): string[] {
  const output = runGit(
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    repositoryRoot,
  );
  return output.split("\0").filter(Boolean).map(normalizeRepositoryPath);
}

export function gitBlobSha(bytes: Buffer): string {
  const header = Buffer.from(`blob ${bytes.byteLength}\0`);
  return createHash("sha1")
    .update(Buffer.concat([header, bytes]))
    .digest("hex");
}

async function readWorkspaceBytes(
  repositoryRoot: string,
  repositoryPath: string,
): Promise<Buffer> {
  const absolutePath = resolve(repositoryRoot, repositoryPath);
  const relativePath = relative(repositoryRoot, absolutePath);
  if (
    isAbsolute(relativePath) ||
    (relativePath !== "" && relativePath.startsWith(`..${sep}`))
  ) {
    throw new Error("path escapes the workspace root");
  }

  const stats = await lstat(absolutePath);
  if (stats.isSymbolicLink()) {
    return Buffer.from(await readlink(absolutePath));
  }
  if (!stats.isFile()) {
    throw new Error("path is not a regular file or symbolic link");
  }
  return readFile(absolutePath);
}

async function snapshotWorkspace(
  repositoryRoot: string,
): Promise<WorkspaceSnapshot> {
  const files = new Map<string, WorkspaceFile>();
  const unreadable = new Map<string, string>();

  for (const repositoryPath of trackedAndUnignoredPaths(repositoryRoot)) {
    try {
      const bytes = await readWorkspaceBytes(repositoryRoot, repositoryPath);
      files.set(repositoryPath, { bytes, sha: gitBlobSha(bytes) });
    } catch (error) {
      unreadable.set(
        repositoryPath,
        error instanceof Error ? error.message : "unknown read error",
      );
    }
  }

  return { files, unreadable };
}

function repositoryApiPath(repository: Repository, path: string): string {
  return `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}${path}`;
}

function safeErrorPath(path: string): string {
  return path.replaceAll(/[\r\n\t]/g, " ");
}

async function githubJson<T>(client: GithubClient, path: string): Promise<T> {
  const response = await client.proxy(GITHUB_CONNECTOR, path, {
    headers: GITHUB_HEADERS,
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API request failed for ${safeErrorPath(path)} (${response.status} ${response.statusText}).`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      `GitHub API returned an invalid JSON response for ${safeErrorPath(path)}.`,
    );
  }
}

export function createGithubClient(
  environment: GithubClientEnvironment = process.env,
  dependencies: GithubClientDependencies = {},
): GithubClient {
  if (environment.GITHUB_ACTIONS !== "true") {
    return dependencies.localClient ?? new ReplitConnectors();
  }

  const token = environment.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is required when parity runs in GitHub Actions.",
    );
  }

  // fetchImplementation and localClient are injectable only for deterministic
  // transport tests; production calls use the global fetch and SDK client.
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  return {
    proxy: async (_connectorName, path) =>
      fetchImplementation(`https://api.github.com${path}`, {
        headers: {
          ...GITHUB_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      }),
  };
}

export async function snapshotRemote(
  client: GithubClient,
  repository: Repository,
  ref: string,
): Promise<RemoteSnapshot> {
  const treePath = repositoryApiPath(
    repository,
    `/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );
  const response = await githubJson<TreeResponse>(client, treePath);
  if (response.truncated === true) {
    throw new Error(
      "GitHub returned a truncated recursive tree; parity cannot be established safely.",
    );
  }
  if (!Array.isArray(response.tree)) {
    throw new Error("GitHub returned no recursive tree for the requested ref.");
  }

  const files = new Map<string, string>();
  const unsupported: string[] = [];
  for (const rawEntry of response.tree as TreeEntry[]) {
    if (typeof rawEntry.path !== "string") {
      throw new Error("GitHub returned a tree entry without a valid path.");
    }
    if (rawEntry.type === "blob" && typeof rawEntry.sha === "string") {
      files.set(normalizeRepositoryPath(rawEntry.path), rawEntry.sha);
    } else if (rawEntry.type !== "tree") {
      unsupported.push(rawEntry.path);
    }
  }

  return { files, unsupported };
}

function contentApiPath(
  repository: Repository,
  repositoryPath: string,
  ref: string,
): string {
  const encodedPath = repositoryPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return repositoryApiPath(
    repository,
    `/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
  );
}

export function decodeBase64Content(content: string): Buffer {
  const compact = content.replaceAll(/\s+/g, "");
  if (
    !compact ||
    !/^[A-Za-z\d+/]*={0,2}$/.test(compact) ||
    compact.length % 4 === 1
  ) {
    throw new Error("GitHub returned invalid base64 content");
  }

  const bytes = Buffer.from(compact, "base64");
  const normalizedInput = compact.replace(/=+$/, "");
  const normalizedOutput = bytes.toString("base64").replace(/=+$/, "");
  if (normalizedInput !== normalizedOutput) {
    throw new Error("GitHub returned invalid base64 content");
  }
  return bytes;
}

export async function checkEntrypoint(
  client: GithubClient,
  repository: Repository,
  ref: string,
  repositoryPath: string,
  workspace: WorkspaceSnapshot,
): Promise<ByteCheck> {
  const workspaceFile = workspace.files.get(repositoryPath);
  if (!workspaceFile) {
    return {
      path: repositoryPath,
      ok: false,
      error:
        workspace.unreadable.get(repositoryPath) ??
        "file is not present locally",
    };
  }

  try {
    const response = await githubJson<ContentResponse>(
      client,
      contentApiPath(repository, repositoryPath, ref),
    );
    if (response.type !== "file" || response.encoding !== "base64") {
      throw new Error("GitHub did not return a base64-encoded file");
    }
    if (typeof response.content !== "string") {
      throw new Error("GitHub returned no file content");
    }
    const remoteBytes = decodeBase64Content(response.content);
    return {
      path: repositoryPath,
      ok: workspaceFile.bytes.equals(remoteBytes),
      workspaceBytes: workspaceFile.bytes.byteLength,
      remoteBytes: remoteBytes.byteLength,
    };
  } catch (error) {
    return {
      path: repositoryPath,
      ok: false,
      workspaceBytes: workspaceFile.bytes.byteLength,
      error: error instanceof Error ? error.message : "unknown content error",
    };
  }
}

function printList(title: string, paths: string[]): void {
  if (paths.length === 0) {
    return;
  }
  console.log(`${title} (${paths.length}):`);
  for (const path of paths.sort()) {
    console.log(`  - ${path}`);
  }
}

function printByteChecks(checks: ByteCheck[]): void {
  console.log("\nEntrypoint byte checks:");
  for (const check of checks) {
    if (check.ok) {
      console.log(`  PASS ${check.path} (${check.workspaceBytes} bytes)`);
      continue;
    }
    const sizes =
      check.workspaceBytes !== undefined
        ? ` (workspace ${check.workspaceBytes} bytes${check.remoteBytes !== undefined ? `, GitHub ${check.remoteBytes} bytes` : ""})`
        : "";
    console.log(
      `  FAIL ${check.path}${sizes}: ${check.error ?? "bytes differ"}`,
    );
  }
}

export type SnapshotComparison = {
  missingOnGitHub: string[];
  extraOnGitHub: string[];
  mismatched: string[];
};

export type GithubParitySummary = SnapshotComparison & {
  unreadable: string[];
  unsupported: string[];
  byteCheckFailures: string[];
};

export function githubParityExitCode(report: GithubParitySummary): number {
  return report.missingOnGitHub.length > 0 ||
    report.extraOnGitHub.length > 0 ||
    report.mismatched.length > 0 ||
    report.unreadable.length > 0 ||
    report.unsupported.length > 0 ||
    report.byteCheckFailures.length > 0
    ? 1
    : 0;
}

function summaryPath(path: string): string {
  return path
    .replaceAll(/[\u0000-\u001f\u007f]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`");
}

function summaryList(title: string, paths: string[]): string {
  const uniquePaths = [...new Set(paths)].sort();
  if (uniquePaths.length === 0) {
    return `### ${title}\n\n_None._`;
  }

  return [
    `### ${title} (${uniquePaths.length})`,
    "",
    ...uniquePaths.map((path) => `- \`${summaryPath(path)}\``),
  ].join("\n");
}

export function formatGithubSummary(report: GithubParitySummary): string {
  return [
    "## GitHub parity",
    githubParityExitCode(report) !== 0
      ? "**Result: failed**"
      : "**Result: passed**",
    "",
    summaryList("Missing on GitHub", report.missingOnGitHub),
    summaryList("Extra in GitHub", report.extraOnGitHub),
    summaryList("Mismatched Git blob SHAs", report.mismatched),
    summaryList("Unreadable workspace paths", report.unreadable),
    summaryList("Unsupported GitHub tree entries", report.unsupported),
    summaryList("Byte-check failures", report.byteCheckFailures),
    "",
  ].join("\n\n");
}

export async function publishGithubSummary(
  summaryPath: string | undefined,
  summary: string,
): Promise<void> {
  if (!summaryPath) {
    return;
  }

  try {
    await appendFile(summaryPath, summary, "utf8");
  } catch {
    console.error("Unable to write the GitHub Actions job summary.");
  }
}

export function compareSnapshots(
  workspace: WorkspaceSnapshot,
  remote: RemoteSnapshot,
): SnapshotComparison {
  const missingOnGitHub: string[] = [];
  const mismatched: string[] = [];
  for (const [path, localFile] of workspace.files) {
    const remoteSha = remote.files.get(path);
    if (!remoteSha) {
      missingOnGitHub.push(path);
    } else if (remoteSha !== localFile.sha) {
      mismatched.push(path);
    }
  }

  const extraOnGitHub = [...remote.files.keys()].filter(
    (path) => !workspace.files.has(path),
  );
  return { missingOnGitHub, extraOnGitHub, mismatched };
}

async function run(options: Options): Promise<number> {
  const repositoryRoot = findRepositoryRoot();
  const client = createGithubClient();
  const [workspace, remote] = await Promise.all([
    snapshotWorkspace(repositoryRoot),
    snapshotRemote(client, options.repository, options.ref),
  ]);
  const comparison = compareSnapshots(workspace, remote);
  const byteChecks = await Promise.all(
    options.entrypoints.map((entrypoint) =>
      checkEntrypoint(
        client,
        options.repository,
        options.ref,
        entrypoint,
        workspace,
      ),
    ),
  );
  const summaryReport: GithubParitySummary = {
    ...comparison,
    unreadable: [...workspace.unreadable.keys()],
    unsupported: remote.unsupported,
    byteCheckFailures: byteChecks
      .filter((check) => !check.ok)
      .map((check) => check.path),
  };

  console.log(
    `GitHub parity: ${options.repository.owner}/${options.repository.name} @ ${options.ref}`,
  );
  console.log(
    `Workspace files: ${workspace.files.size}; GitHub blobs: ${remote.files.size}`,
  );
  printList("Missing on GitHub", comparison.missingOnGitHub);
  printList("Extra in GitHub", comparison.extraOnGitHub);
  printList("Mismatched Git blob SHAs", comparison.mismatched);
  printList("Unreadable workspace paths", [...workspace.unreadable.keys()]);
  printList("Unsupported GitHub tree entries", remote.unsupported);
  printByteChecks(byteChecks);

  await publishGithubSummary(
    options.summaryPath ?? process.env.GITHUB_STEP_SUMMARY,
    formatGithubSummary(summaryReport),
  );
  const exitCode = githubParityExitCode(summaryReport);
  if (exitCode !== 0) {
    console.log(
      "\nParity check failed. Resolve every reported path, then run the command again.",
    );
    return exitCode;
  }

  console.log("\nParity check passed: workspace and GitHub match.");
  return 0;
}

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2);
    if (argv[0] === "--") {
      argv.shift();
    }
    const options = parseOptions(argv);
    if (!options) {
      console.log(usage());
      return;
    }
    process.exitCode = await run(options);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
    } else {
      console.error(
        `Parity check could not complete: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main();
}
