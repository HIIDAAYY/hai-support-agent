/**
 * Loads .env.local for CLI scripts.
 *
 * Import this FIRST, before anything that touches process.env:
 *
 *   import "./lib/env";
 *   import { getPineconeIndex } from "../lib/pinecone";
 *
 * ESM hoists every `import` above the module body, so the older pattern of
 * calling config() between imports actually ran *after* those imports were
 * evaluated. It only worked because the Pinecone clients happen to initialise
 * lazily. Loading env from an imported module makes the ordering explicit
 * instead of accidental.
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ENV_PATH = resolve(__dirname, "../../.env.local");

config({ path: ENV_PATH, override: true });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ ${name} is not set. Expected it in ${ENV_PATH}`);
    process.exit(1);
  }
  return value;
}
