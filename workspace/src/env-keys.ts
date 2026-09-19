import { access, copyFile } from "node:fs/promises";
import path from "node:path";

import { getPrimaryWorktreePath } from "./git-worktree.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureEnvKeys(worktreeRoot: string): Promise<boolean> {
  const localKeysPath = path.join(worktreeRoot, ".env.keys");
  if ((await pathExists(localKeysPath)) || process.env.DOTENV_PRIVATE_KEY) {
    return true;
  }

  const primaryKeysPath = path.join(getPrimaryWorktreePath(worktreeRoot), ".env.keys");
  if (await pathExists(primaryKeysPath)) {
    await copyFile(primaryKeysPath, localKeysPath);
    console.log(`Copied .env.keys from ${primaryKeysPath}`);
    return true;
  }

  return false;
}
