/**
 * Migratie Alle10top: Content Collections (markdown) → Sanity
 *
 * Leest apps/web/src/content/{posts,legal}, converteert markdown naar
 * Portable Text (scripts/markdown-to-portable-text.ts) en zet de
 * productlijst-HTML-blokken om naar gestructureerde productList-objecten.
 *
 * Gebruik (vanaf de repo-root):
 *   SANITY_WRITE_TOKEN=<token> npx tsx scripts/migrate-alle10top.ts
 *
 * Vereist apps/web/.env met SANITY_PROJECT_ID en SANITY_DATASET, of geef ze
 * mee als omgevingsvariabelen. Draai zonder token eerst met --dry-run om de
 * documenten als ndjson naar scripts/sanity-export.ndjson te schrijven.
 */

import { createClient } from "@sanity/client";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { config } from "dotenv";
import { markdownToPortableText, resetKeys } from "./markdown-to-portable-text";

const HIER = __dirname;
const WEB = path.join(HIER, "../apps/web");
const POSTS = path.join(WEB, "src/content/posts");
const LEGAL = path.join(WEB, "src/content/legal");

config({ path: path.join(WEB, ".env") });

const dryRun = process.argv.includes("--dry-run");
const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";

if (!dryRun && !projectId) {
  console.error("SANITY_PROJECT_ID ontbreekt (apps/web/.env). Of draai met --dry-run.");
  process.exit(1);
}

let sleutel = 0;
const key = () => `a10-${(sleutel++).toString(36)}`;

/** Parse de door de conversie gegenereerde product-lijst-HTML naar een object. */
function parseProductLijst(html: string) {
  const layout = /product-lijst--(\w+)/.exec(html)?.[1] ?? "list";
  const title = /class="product-lijst__kop[^"]*">([^<]*)</.exec(html)?.[1] ?? "";
  const products: Array<Record<string, string | { _type: string; _key: string }>> = [];
  const kaarten = html.split('<article class="product-kaart">').slice(1);
  for (const k of kaarten) {
    const img = /<img src="([^"]+)"[^>]*alt="([^"]*)"/.exec(k);
    const h3 = /<h3>([\s\S]*?)<\/h3>/.exec(k);
    const prijs = /product-kaart__prijs">([^<]*)</.exec(k);
    const rating = /product-kaart__rating">★\s*([^<]*)</.exec(k);
    const url = /href="([^"]+)"/.exec(k);
    products.push({
      _type: "product",
      _key: key(),
      title: decode(h3?.[1] ?? img?.[2] ?? "Product"),
      ...(img ? { imageUrl: img[1] } : {}),
      ...(prijs ? { price: prijs[1] } : {}),
      ...(rating ? { rating: rating[1] } : {}),
      ...(url ? { url: url[1] } : {}),
    } as any);
  }
  return {
    _type: "productList",
    _key: key(),
    title: decode(title),
    layout,
    products,
  };
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** markdown → PT; productlijst-HTML wordt vooraf uitgeknipt en als object teruggeplaatst. */
function bodyNaarPt(markdown: string, logNaam: string): any[] {
  const blokken: any[] = [];
  // De lijst eindigt op "</article>\n</div>"; een non-greedy match tot de
  // eerste </div> zou binnen de eerste productkaart stoppen.
  const delen = markdown.split(
    /(<div class="product-lijst[\s\S]*?<\/article>\s*<\/div>)/
  );
  for (const deel of delen) {
    if (!deel.trim()) continue;
    if (deel.startsWith('<div class="product-lijst')) {
      blokken.push(parseProductLijst(deel));
      continue;
    }
    resetKeys();
    const { blocks, log } = markdownToPortableText(deel);
    for (const regel of log) console.log(`  [${logNaam}] ${regel}`);
    for (const b of blocks as any[]) {
      // image-placeholders ({_sanityAsset: "image@src"}) → externalImage,
      // want de uploads-bestanden zijn er nog niet
      if (b._type === "image" && typeof b._sanityAsset === "string") {
        blokken.push({
          _type: "externalImage",
          _key: key(),
          url: b._sanityAsset.replace(/^image@/, ""),
          alt: b.alt ?? "",
        });
      } else {
        blokken.push(b);
      }
    }
  }
  return blokken;
}

function leesMd(dir: string) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      return { slug: path.basename(file, ".md"), frontmatter: data, body: content };
    });
}

const documenten: any[] = [];

for (const { slug, frontmatter: fm, body } of leesMd(POSTS)) {
  documenten.push({
    _id: `post-${slug}`,
    _type: "post",
    title: fm.title,
    slug: { _type: "slug", current: slug },
    description: fm.description,
    pubDate: new Date(fm.pubDate).toISOString(),
    category: fm.category,
    tags: fm.tags ?? [],
    legacyPath: fm.legacyPath,
    published: fm.published !== false,
    ...(fm.image?.url ? { imageUrl: fm.image.url } : {}),
    body: bodyNaarPt(body, slug),
  });
}

for (const { slug, frontmatter: fm, body } of leesMd(LEGAL)) {
  documenten.push({
    _id: `legal-${slug}`,
    _type: "legalPage",
    page: fm.page,
    slug: { _type: "slug", current: slug },
    pubDate: new Date(fm.pubDate).toISOString(),
    body: bodyNaarPt(body, slug),
  });
}

console.log(`documenten voorbereid: ${documenten.length}`);

if (dryRun) {
  const uit = path.join(HIER, "sanity-export.ndjson");
  fs.writeFileSync(uit, documenten.map((d) => JSON.stringify(d)).join("\n"));
  console.log(`dry-run: geschreven naar ${uit} (importeerbaar met \`sanity dataset import\`)`);
  process.exit(0);
}

const client = createClient({
  projectId: projectId!,
  dataset,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

(async () => {
  for (let i = 0; i < documenten.length; i += 20) {
    const batch = documenten.slice(i, i + 20);
    let tx = client.transaction();
    for (const doc of batch) tx = tx.createOrReplace(doc);
    await tx.commit();
    console.log(`geüpload: ${Math.min(i + 20, documenten.length)}/${documenten.length}`);
  }
  console.log("klaar.");
})();
