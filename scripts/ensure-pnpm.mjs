const userAgent = process.env.npm_config_user_agent ?? "";
const execPath = process.env.npm_execpath ?? "";

if (userAgent.includes("pnpm") || execPath.includes("pnpm")) {
  process.exit(0);
}

console.error([
  "WorkCue source checkout uses pnpm, not npm.",
  "",
  "Use this repository with:",
  "  pnpm install",
  "  pnpm today --demo",
  "",
  "To install the published CLI package, run npm outside this source checkout:",
  "  npm install -g workcue@alpha",
  "  npx workcue@alpha today --demo",
  "",
  "Mixing npm install with pnpm node_modules can trigger npm arborist errors."
].join("\n"));

process.exit(1);
