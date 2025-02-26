import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use node-fetch for Node.js environments
let fetchFunc;
if (typeof fetch === "undefined") {
  const nodeFetch = await import("node-fetch");
  fetchFunc = nodeFetch.default;
} else {
  fetchFunc = fetch;
}

async function executeSql(sql: string): Promise<void> {
  try {
    console.log("Executing SQL...");

    const response = await fetchFunc(`${supabaseUrl}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Prefer: "params=single-object",
      },
      body: JSON.stringify({
        query: sql,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SQL execution failed: ${error}`);
    }

    console.log("SQL executed successfully");
  } catch (error) {
    console.error("Error executing SQL:", error);
    throw error;
  }
}

async function applySchema(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, "../src/lib/supabase-schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying database schema...");
    await executeSql(schema);
    console.log("Schema applied successfully!");
  } catch (error) {
    console.error("Error applying schema:", error);
    process.exit(1);
  }
}

async function applyFunctions(): Promise<void> {
  try {
    const functionsPath = path.join(
      __dirname,
      "../src/lib/supabase-functions.sql"
    );
    const functions = fs.readFileSync(functionsPath, "utf8");

    console.log("Applying database functions...");
    await executeSql(functions);
    console.log("Functions applied successfully!");
  } catch (error) {
    console.error("Error applying functions:", error);
    process.exit(1);
  }
}

async function setup(): Promise<void> {
  await applySchema();
  await applyFunctions();
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
