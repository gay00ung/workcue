import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { syncObsidianVault } from "./sync.js";

describe("syncObsidianVault", () => {
  it("loads markdown tasks from included files", async () => {
    const vault = await mkdtemp(path.join(os.tmpdir(), "workcue-vault-"));
    await mkdir(path.join(vault, "Daily"));
    await mkdir(path.join(vault, "Archive"));
    await writeFile(path.join(vault, "Daily", "2026-05-29.md"), "- [ ] Ship connector #work 📅 2026-05-29");
    await writeFile(path.join(vault, "Archive", "old.md"), "- [ ] Archived task #work");

    const items = await syncObsidianVault({
      vaultPath: vault,
      include: ["Daily/**/*.md"],
      exclude: ["Archive/**"],
      assignee: "you"
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Ship connector");
    expect(items[0]?.sourceId).toBe("Daily/2026-05-29.md:1");
  });
});
