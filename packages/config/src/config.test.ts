import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createInitialConfig, expandDateTemplate, loadConfig, writeConfig } from "./config.js";

describe("config", () => {
  it("creates a public-safe template by default", () => {
    const config = createInitialConfig();

    expect(config.sources.obsidian.enabled).toBe(false);
    expect(config.sources.obsidian.vaultPath).toBe("/path/to/obsidian-vault");
  });

  it("writes and loads config files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "workcue-config-"));
    const configPath = path.join(root, "config.yml");
    const config = createInitialConfig({ obsidianVault: "/vault" });

    await writeConfig(configPath, config);

    await expect(readFile(configPath, "utf8")).resolves.toContain("version: 1");
    await expect(loadConfig(configPath)).resolves.toMatchObject({
      version: 1,
      sources: {
        obsidian: {
          enabled: true,
          vaultPath: "/vault"
        }
      }
    });
  });

  it("expands date templates", () => {
    expect(expandDateTemplate("./briefs/{{date}}.md", "2026-05-29")).toBe("./briefs/2026-05-29.md");
  });
});
