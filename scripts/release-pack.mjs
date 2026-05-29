import { execFileSync } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const packageOrder = [
  "@workcue/core",
  "@workcue/config",
  "@workcue/output-markdown",
  "@workcue/connector-github",
  "@workcue/connector-jira",
  "@workcue/connector-notion",
  "@workcue/connector-obsidian",
  "@workcue/llm",
  "@workcue/cache-sqlite",
  "@workcue/runtime",
  "@workcue/mcp-server",
  "workcue"
];

const tarballDir = path.resolve(".release", "tarballs");
const packageJson = JSON.parse(await readFile("apps/cli/package.json", "utf8"));
const expectedVersion = packageJson.version;
await rm(path.resolve(".release"), { force: true, recursive: true });

for (const packageName of packageOrder) {
  run("pnpm", ["--filter", packageName, "pack", "--pack-destination", tarballDir]);
}

const tarballs = (await readdir(tarballDir))
  .filter((file) => file.endsWith(".tgz"))
  .map((file) => path.join(tarballDir, file))
  .sort();

if (tarballs.length !== packageOrder.length) {
  throw new Error(`Expected ${packageOrder.length} tarballs, found ${tarballs.length}.`);
}

for (const tarball of tarballs) {
  const contents = run("tar", ["-tzf", tarball]);
  for (const forbidden of ["src/", "tsconfig.tsbuildinfo", ".env", ".codex/local.env"]) {
    if (contents.includes(forbidden)) {
      throw new Error(`Unexpected ${forbidden} in ${path.basename(tarball)}.`);
    }
  }
}

const installRoot = await mkdtemp(path.join(os.tmpdir(), "workcue-pack-install-"));
run("npm", ["install", "--prefix", installRoot, "--no-audit", "--fund=false", ...tarballs]);

const binRoot = path.join(installRoot, "node_modules", ".bin");
run(path.join(binRoot, "workcue"), ["--version"], { expectedIncludes: expectedVersion });
run(path.join(binRoot, "workcue"), ["today", "--demo", "--date", "2026-05-29"], { expectedIncludes: "Top recommendation" });
await access(path.join(binRoot, "workcue-mcp"));

console.log(`Release pack passed. Tarballs written to ${tarballDir}`);

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (options.expectedIncludes && !output.includes(options.expectedIncludes)) {
    throw new Error(`Expected command output to include ${JSON.stringify(options.expectedIncludes)}: ${command} ${args.join(" ")}`);
  }

  return output;
}
