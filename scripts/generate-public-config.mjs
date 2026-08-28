import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY are required to build the hosted frontend."
  );
}

const publicConfig = {
  supabaseUrl,
  supabaseAnonKey
};

const contents = `window.STOKVEL_CONFIG = Object.freeze(${JSON.stringify(
  publicConfig,
  null,
  2
)});\n`;

await writeFile(resolve("frontend", "config.js"), contents, "utf8");
console.log("Generated frontend/config.js from public deployment settings.");
