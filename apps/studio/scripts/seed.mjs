/**
 * Full seed: delete all documents of each content type, then create exactly one
 * document per type (post, teamMember, legalPage). Run with: pnpm run seed:all
 *
 * Requires: SANITY_STUDIO_PROJECT_ID, SANITY_STUDIO_DATASET, and a write token
 * (SANITY_API_WRITE_TOKEN, SANITY_WRITE_TOKEN, or SANITY_TOKEN) in apps/studio/.env
 * or apps/web/.env (script loads both when run from studio).
 */

import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

loadEnv(join(__dirname, "..", ".env"));
loadEnv(join(__dirname, "..", "..", "web", ".env"));

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.SANITY_DATASET || "production";
const token =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_TOKEN;

if (!projectId) {
  console.error("Missing SANITY_STUDIO_PROJECT_ID or SANITY_PROJECT_ID");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: token || undefined,
});

const BATCH_SIZE = 25;
const TARGET_IDS = {
  post: ["post-1"],
  teamMember: ["teamMember-jordan-wells"],
  legalPage: ["legalPage-terms"],
};

async function fetchDocIdsByType(type) {
  const docs = await client.fetch(`*[_type == $type]._id`, { type });
  return docs;
}

async function deleteInBatches(ids) {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const tx = client.transaction();
    for (const id of batch) {
      tx.delete(id);
    }
    await tx.commit();
  }
}

async function run() {
  const types = ["post", "teamMember", "legalPage"];

  // 1) Delete all documents of each type (batched)
  for (const type of types) {
    const ids = await fetchDocIdsByType(type);
    if (ids.length > 0) {
      await deleteInBatches(ids);
      console.log(`Deleted ${ids.length} document(s) of type "${type}".`);
    }
  }

  // 2) Id-based cleanup: delete exact ids we are about to create
  const allTargetIds = Object.values(TARGET_IDS).flat();
  await deleteInBatches(allTargetIds);
  console.log("Cleaned target document ids.");

  // 3) Short delay so Sanity can apply mutations
  await new Promise((r) => setTimeout(r, 2500));

  // 4) Create one document per type
  const createTx = client.transaction();

  createTx.createOrReplace({
    _id: "post-1",
    _type: "post",
    title: "Getting started with Astro and Sanity",
    slug: { _type: "slug", current: "1" },
    description: "A short guide to building with Astro v6 and Sanity CMS.",
    pubDate: "2025-01-15T00:00:00.000Z",
    tags: ["astro", "sanity", "cms"],
    body: [
      {
        _type: "block",
        _key: "a",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "b",
            text: "Welcome to the single example post. Content is synced to Sanity Studio via the seed script.",
            marks: [],
          },
        ],
      },
    ],
  });

  createTx.createOrReplace({
    _id: "teamMember-jordan-wells",
    _type: "teamMember",
    name: "Jordan Wells",
    slug: { _type: "slug", current: "jordan-wells" },
    role: "Lead Developer",
    bio: "Building themes and tooling.",
    body: [
      {
        _type: "block",
        _key: "a",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "b",
            text: "Single team member example. Synced to Sanity via seed script.",
            marks: [],
          },
        ],
      },
    ],
  });

  createTx.createOrReplace({
    _id: "legalPage-terms",
    _type: "legalPage",
    page: "Terms of Service",
    slug: { _type: "slug", current: "terms" },
    pubDate: "2025-01-01T00:00:00.000Z",
    body: [
      {
        _type: "block",
        _key: "a",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "b",
            text: "Single legal page example. Synced to Sanity via seed script.",
            marks: [],
          },
        ],
      },
    ],
  });

  await createTx.commit();
  console.log("Created one document per type: post, teamMember, legalPage.");
  console.log("Done. Running seed:all gives one document per collection in Studio.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
