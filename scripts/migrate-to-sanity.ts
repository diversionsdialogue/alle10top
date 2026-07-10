/**
 * Migration Script: Content Collections → Sanity
 *
 * This script reads your existing markdown content and uploads it to Sanity,
 * including images.
 *
 * Usage:
 *   cd scripts
 *   SANITY_WRITE_TOKEN=your-token npx tsx migrate-to-sanity.ts
 *
 * The script automatically reads SANITY_PROJECT_ID from apps/web/.env
 */

import { createClient } from "@sanity/client";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { config } from "dotenv";

// Load environment variables from apps/web/.env
const webEnvPath = path.join(__dirname, "../apps/web/.env");
if (fs.existsSync(webEnvPath)) {
  config({ path: webEnvPath });
}

// Sanity client configuration
const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";

if (!projectId) {
  console.error("\n❌ Error: SANITY_PROJECT_ID is missing.");
  console.log("\nMake sure apps/web/.env exists with:");
  console.log("  SANITY_PROJECT_ID=your-project-id");
  console.log("\nOr pass it directly:");
  console.log(
    "  SANITY_PROJECT_ID=your-project-id SSANITY_WRITE_TOKEN=your-token npx tsx migrate-to-sanity.ts"
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token: process.env.SSANITY_WRITE_TOKEN, // You need to set this
  useCdn: false,
});

const WEB_PATH = path.join(__dirname, "../apps/web/src");
const CONTENT_PATH = path.join(WEB_PATH, "content");
const IMAGES_PATH = path.join(WEB_PATH, "images");

// Helper to read markdown files from a directory
function readMarkdownFiles(dir: string) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content: body } = matter(content);
    const slug = path.basename(file, ".md");
    return { slug, frontmatter: data, body };
  });
}

// Upload an image to Sanity and return the asset reference
async function uploadImage(imagePath: string, altText: string = "") {
  // Convert /src/images/... path to actual file path
  const relativePath = imagePath.replace(/^\/src\/images\//, "");
  const fullPath = path.join(IMAGES_PATH, relativePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Image not found: ${fullPath}`);
    return null;
  }

  try {
    const imageBuffer = fs.readFileSync(fullPath);
    const asset = await client.assets.upload("image", imageBuffer, {
      filename: path.basename(fullPath),
    });

    return {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: asset._id,
      },
      alt: altText,
    };
  } catch (error) {
    console.error(`Failed to upload image: ${fullPath}`, error);
    return null;
  }
}

// Convert markdown to Portable Text blocks (simplified)
function markdownToPortableText(markdown: string) {
  const blocks: any[] = [];
  const lines = markdown.split("\n");
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join("\n").trim();
      if (text) {
        blocks.push({
          _type: "block",
          _key: Math.random().toString(36).substr(2, 9),
          style: "normal",
          markDefs: [],
          children: [
            {
              _type: "span",
              _key: Math.random().toString(36).substr(2, 9),
              text: text,
              marks: [],
            },
          ],
        });
      }
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    // Headers
    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: Math.random().toString(36).substr(2, 9),
        style: "h2",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: Math.random().toString(36).substr(2, 9),
            text: line.replace(/^## /, ""),
            marks: [],
          },
        ],
      });
    } else if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: Math.random().toString(36).substr(2, 9),
        style: "h3",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: Math.random().toString(36).substr(2, 9),
            text: line.replace(/^### /, ""),
            marks: [],
          },
        ],
      });
    } else if (line.startsWith("#### ")) {
      flushParagraph();
      blocks.push({
        _type: "block",
        _key: Math.random().toString(36).substr(2, 9),
        style: "h4",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: Math.random().toString(36).substr(2, 9),
            text: line.replace(/^#### /, ""),
            marks: [],
          },
        ],
      });
    } else if (line.trim() === "") {
      flushParagraph();
    } else if (!line.startsWith("![") && !line.startsWith("|")) {
      // Skip images and tables for now, add to paragraph
      currentParagraph.push(line);
    }
  }

  flushParagraph();
  return blocks;
}

// Migrate authors
async function migrateAuthors() {
  console.log("\n📝 Migrating Authors...");
  const authors = readMarkdownFiles(path.join(CONTENT_PATH, "authors"));
  const authorMap: Record<string, string> = {}; // slug -> _id

  for (const author of authors) {
    const { slug, frontmatter } = author;
    console.log(`  - ${frontmatter.name} (${slug})`);

    // Upload image
    let image = null;
    if (frontmatter.image?.url) {
      image = await uploadImage(frontmatter.image.url, frontmatter.image.alt);
    }

    // Create or update author document
    const doc = {
      _type: "author",
      _id: `author-${slug}`,
      name: frontmatter.name,
      slug: { _type: "slug", current: slug },
      role: frontmatter.role,
      bio: frontmatter.bio,
      image,
      socials: frontmatter.socials
        ? {
            twitter:
              frontmatter.socials.twitter !== "#_"
                ? frontmatter.socials.twitter
                : undefined,
            website:
              frontmatter.socials.website !== "#_"
                ? frontmatter.socials.website
                : undefined,
            linkedin:
              frontmatter.socials.linkedin !== "#_"
                ? frontmatter.socials.linkedin
                : undefined,
            email: frontmatter.socials.email,
          }
        : undefined,
    };

    try {
      const result = await client.createOrReplace(doc);
      authorMap[slug] = result._id;
      console.log(`    ✓ Created author: ${frontmatter.name}`);
    } catch (error) {
      console.error(
        `    ✗ Failed to create author: ${frontmatter.name}`,
        error
      );
    }
  }

  return authorMap;
}

// Migrate posts
async function migratePosts(authorMap: Record<string, string>) {
  console.log("\n📰 Migrating Posts...");
  const posts = readMarkdownFiles(path.join(CONTENT_PATH, "posts"));

  for (const post of posts) {
    const { slug, frontmatter, body } = post;
    console.log(`  - ${frontmatter.title} (${slug})`);

    // Upload image
    let image = null;
    if (frontmatter.image?.url) {
      image = await uploadImage(frontmatter.image.url, frontmatter.image.alt);
    }

    // Get author reference
    const authorRef =
      frontmatter.author && authorMap[frontmatter.author]
        ? { _type: "reference", _ref: authorMap[frontmatter.author] }
        : undefined;

    // Convert body to Portable Text
    const portableTextBody = markdownToPortableText(body);

    const doc = {
      _type: "post",
      _id: `post-${slug}`,
      title: frontmatter.title,
      slug: { _type: "slug", current: slug },
      description: frontmatter.description,
      pubDate: new Date(frontmatter.pubDate).toISOString(),
      image,
      tags: frontmatter.tags || [],
      isBreaking: frontmatter.isBreaking || false,
      isTopStory: frontmatter.isTopStory || false,
      isFeatured: frontmatter.isFeatured || false,
      isBrief: frontmatter.isBrief || false,
      isLocked: frontmatter.isLocked || false,
      author: authorRef,
      body: portableTextBody,
    };

    try {
      await client.createOrReplace(doc);
      console.log(`    ✓ Created post: ${frontmatter.title}`);
    } catch (error) {
      console.error(`    ✗ Failed to create post: ${frontmatter.title}`, error);
    }
  }
}

// Migrate podcasts
async function migratePodcasts(authorMap: Record<string, string>) {
  console.log("\n🎙️ Migrating Podcasts...");
  const podcasts = readMarkdownFiles(path.join(CONTENT_PATH, "podcast"));

  for (const podcast of podcasts) {
    const { slug, frontmatter, body } = podcast;
    console.log(`  - ${frontmatter.title} (${slug})`);

    // Upload image
    let image = null;
    if (frontmatter.image?.url) {
      image = await uploadImage(frontmatter.image.url, frontmatter.image.alt);
    }

    // Get author reference
    const authorRef =
      frontmatter.author && authorMap[frontmatter.author]
        ? { _type: "reference", _ref: authorMap[frontmatter.author] }
        : undefined;

    // Convert body to Portable Text
    const portableTextBody = markdownToPortableText(body);

    const doc = {
      _type: "podcast",
      _id: `podcast-${slug}`,
      title: frontmatter.title,
      slug: { _type: "slug", current: slug },
      description: frontmatter.description,
      pubDate: new Date(frontmatter.pubDate).toISOString(),
      image,
      episodeNumber: frontmatter.episodeNumber,
      duration: frontmatter.duration,
      audioSrc: frontmatter.audioSrc,
      tags: frontmatter.tags || [],
      isFeatured: frontmatter.isFeatured || false,
      isGuest: frontmatter.isGuest || false,
      isSeries: frontmatter.isSeries || false,
      isLocked: frontmatter.isLocked || false,
      author: authorRef,
      body: portableTextBody,
    };

    try {
      await client.createOrReplace(doc);
      console.log(`    ✓ Created podcast: ${frontmatter.title}`);
    } catch (error) {
      console.error(
        `    ✗ Failed to create podcast: ${frontmatter.title}`,
        error
      );
    }
  }
}

// Migrate jobs
async function migrateJobs() {
  console.log("\n💼 Migrating Jobs...");
  const jobsDir = path.join(CONTENT_PATH, "jobs");

  if (!fs.existsSync(jobsDir)) {
    console.log("  No jobs directory found, skipping...");
    return;
  }

  const jobs = readMarkdownFiles(jobsDir);

  for (const job of jobs) {
    const { slug, frontmatter } = job;
    console.log(`  - ${frontmatter.title} (${slug})`);

    const doc = {
      _type: "job",
      _id: `job-${slug}`,
      title: frontmatter.title,
      slug: { _type: "slug", current: slug },
      pubDate: new Date(frontmatter.pubDate).toISOString(),
      description: frontmatter.description,
      jobType: frontmatter.jobType,
      company: frontmatter.company,
      location: frontmatter.location,
      category: frontmatter.category,
      jobLevel: frontmatter.jobLevel,
      experience: frontmatter.experience,
      salaryRange: frontmatter.salaryRange,
      salaryType: frontmatter.salaryType,
      employmentStatus: frontmatter.employmentStatus,
      responsibilities: frontmatter.responsibilities || [],
      requirements: frontmatter.requirements || [],
      benefits: frontmatter.benefits || [],
      applicationDeadline: frontmatter.applicationDeadline
        ? new Date(frontmatter.applicationDeadline).toISOString()
        : undefined,
      skills: frontmatter.skills || [],
      perks: frontmatter.perks || [],
      contactEmail: frontmatter.contactEmail,
      referenceId: frontmatter.referenceId,
      workEnvironment: frontmatter.workEnvironment,
      companyCulture: frontmatter.companyCulture,
      hiringManager: frontmatter.hiringManager,
      applicationInstructions: frontmatter.applicationInstructions,
    };

    try {
      await client.createOrReplace(doc);
      console.log(`    ✓ Created job: ${frontmatter.title}`);
    } catch (error) {
      console.error(`    ✗ Failed to create job: ${frontmatter.title}`, error);
    }
  }
}

// Migrate help center articles
async function migrateHelpCenter() {
  console.log("\n❓ Migrating Help Center...");
  const helpDir = path.join(CONTENT_PATH, "helpCenter");

  if (!fs.existsSync(helpDir)) {
    console.log("  No helpCenter directory found, skipping...");
    return;
  }

  const articles = readMarkdownFiles(helpDir);

  for (const article of articles) {
    const { slug, frontmatter, body } = article;
    console.log(`  - ${frontmatter.title} (${slug})`);

    // Convert body to Portable Text
    const portableTextBody = markdownToPortableText(body);

    const doc = {
      _type: "helpCenter",
      _id: `help-${slug}`,
      title: frontmatter.title,
      slug: { _type: "slug", current: slug },
      pubDate: new Date(frontmatter.pubDate).toISOString(),
      description: frontmatter.description,
      body: portableTextBody,
    };

    try {
      await client.createOrReplace(doc);
      console.log(`    ✓ Created help article: ${frontmatter.title}`);
    } catch (error) {
      console.error(
        `    ✗ Failed to create help article: ${frontmatter.title}`,
        error
      );
    }
  }
}

// Main migration function
async function migrate() {
  console.log("🚀 Starting migration to Sanity...\n");
  console.log("Project ID:", projectId);
  console.log("Dataset:", dataset);

  if (!process.env.SSANITY_WRITE_TOKEN) {
    console.error("\n❌ Error: SSANITY_WRITE_TOKEN environment variable is required.");
    console.log("\nTo get a token:");
    console.log("1. Go to https://www.sanity.io/manage → Your Project → API");
    console.log("2. Create a new token with 'Editor' permissions");
    console.log(
      "3. Run: SANITY_PROJECT_ID=your-project-id SSANITY_WRITE_TOKEN=your-token npx tsx migrate-to-sanity.ts"
    );
    process.exit(1);
  }

  try {
    // Migrate in order (authors first since posts reference them)
    const authorMap = await migrateAuthors();
    await migratePosts(authorMap);
    await migratePodcasts(authorMap);
    await migrateJobs();
    await migrateHelpCenter();

    console.log("\n✅ Migration complete!");
    console.log("\nYou can now:");
    console.log("1. Open Sanity Studio: cd apps/studio && pnpm dev");
    console.log("2. View your content at http://localhost:3333");
    console.log("3. Run the site: cd apps/web && pnpm dev");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
