import "dotenv/config";
import { closeSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
if (!databaseUrl.startsWith("file:")) {
  throw new Error("DATABASE_URL deve apontar para SQLite com o prefixo file:.");
}

const databasePath = databaseUrl.startsWith("file://")
  ? fileURLToPath(databaseUrl)
  : path.resolve(process.cwd(), decodeURIComponent(databaseUrl.slice("file:".length)));

mkdirSync(path.dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));
console.log(`SQLite pronto: ${databasePath}`);
