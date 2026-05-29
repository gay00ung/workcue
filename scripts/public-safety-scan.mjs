import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const patterns = [
  { label: "absolute user path", regex: new RegExp("/" + "Users/") },
  { label: "desktop project path", regex: new RegExp("/" + "Desktop/projects") },
  { label: "personal email provider reference", regex: new RegExp("g" + "mail", "i") },
  { label: "classic GitHub token", regex: /ghp_[A-Za-z0-9_]{20,}/ },
  { label: "fine-grained GitHub token", regex: /github_pat_[A-Za-z0-9_]{20,}/ },
  { label: "OpenAI-style secret value", regex: /sk-[A-Za-z0-9]{20,}/ }
];

const findings = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(file);
  } catch {
    continue;
  }

  if (content.includes(0)) {
    continue;
  }

  const text = content.toString("utf8");
  for (const pattern of patterns) {
    const match = pattern.regex.exec(text);
    if (match) {
      findings.push(`${file}: ${pattern.label}: ${match[0]}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential private path or token value found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Public safety scan passed.");
