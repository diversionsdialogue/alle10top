# AGENTS.md — Lexington Themes Astro + Sanity starter

This repository (`lexington-sanity-starter`) is a **pnpm monorepo** published by [_lexingtonthemes.com_](https://lexingtonthemes.com/) bundling an **Astro 6** marketing-style site with a **hero landing page**, **blog** (listing, posts, tag directory), **team** directory, **legal** pages, **RSS**, and **design-system reference routes** under `/system/*`. It is aimed at **product marketing / content sites** that pair a polished Lexington UI kit with optional **Sanity CMS** for editable posts, team, legal copy, and site-wide SEO defaults. Support and theme docs follow the README’s Lexington links (documentation, changelog, support, bundle).

---

## Tech stack (from manifests and config only)

**Root** (`package.json`)

- **Package manager:** `pnpm@9.15.0` (`packageManager` field).
- **Workspaces:** `pnpm-workspace.yaml` lists `apps/*` and `packages/*` (no `packages/` directory in this checkout).
- **Scripts:** `dev` (parallel `-r dev`), `dev:web` / `dev:studio` (`--filter`), `build` / `build:web` / `build:studio`, `clean` (`scripts/clean.sh`), `seed:all` → `pnpm --filter @lexington/studio run seed`.
- **No runtime dependencies** at root; no `@sanity/client` at root (only in apps).

**`apps/web`** (`package.json` + `astro.config.mjs`)

- **Astro** `^6.0.0`.
- **Tailwind CSS 4** via **Vite** plugin `@tailwindcss/vite` / `tailwindcss` (devDependencies).
- **Integrations (astro.config):** `@astrojs/sitemap` only.
- **Other deps:** `@astrojs/rss` (`4.0.15-beta.4`), `@lexingtonthemes/seo`, `@sanity/client`, `@sanity/image-url`, `@portabletext/to-html`, `@portabletext/types`, `groq`, `reading-time`, `@tailwindcss/forms`, `@tailwindcss/typography`, `tailwind-scrollbar-hide`.
- **Not listed** in `apps/web/package.json`: `@astrojs/mdx`, `sharp`, `@astrojs/image` — do not assume them.
- **astro.config.mjs:** `site: "https://yourwebsite.com"`; `integrations: [sitemap()]`, `vite.plugins: [tailwindcss()]`; `experimental.svgo: true`; `markdown.drafts: true`, `markdown.shikiConfig.theme: "css-variables"`; top-level `shikiConfig` (`wrap`, `skipInline`, `drafts`).

**`apps/studio`**

- **sanity** `^5.15.0`, **React** 19, **styled-components**, **@sanity/icons**, **@sanity/vision** (`@sanity/vision` ^5.4.0).
- **sanity.config.ts:** `structureTool({ structure })` from `./structure`, `visionTool()`; schema types from `./schemas`; project/dataset from `SANITY_STUDIO_*` env.

---

## Monorepo layout (actual paths)

| Area | Path |
|------|------|
| Site entry | `apps/web/` |
| Pages | `apps/web/src/pages/` |
| Layouts | `apps/web/src/layouts/` |
| Components | `apps/web/src/components/` (includes **`fundations/`** — keep this spelling) |
| Content collections (markdown) | `apps/web/src/content/` |
| Collection config | `apps/web/src/content.config.ts` |
| Global styles / tokens | `apps/web/src/styles/global.css` |
| Sanity integration | `apps/web/src/lib/sanity/` (`client.ts`, `fetch.ts`, `queries.ts`, `transforms.ts`, `types.ts`, `image.ts`, `portableText.ts`, `index.ts`) |
| **Unified data module** | `apps/web/src/lib/data.ts` — **not present in this repo** (README still describes `USE_SANITY` there; see “Dual content model” below). |
| Static `public/` | **Not present** in this checkout — add `apps/web/public/` if you need static assets. |
| Studio | `apps/studio/` |
| Schemas | `apps/studio/schemas/` |
| Studio structure | `apps/studio/structure.ts` |
| Root scripts | `scripts/` (`clean.sh`, `migrate-to-sanity.ts`) |
| Studio seed | `apps/studio/scripts/seed.mjs` |

---

## Dual content model (explicit)

### A) Astro Content Collections — `apps/web/src/content.config.ts`

Loaders use `glob` + **Zod** (`astro/zod`). Images are **not** `image()` / `imageSchema`; they are optional **`{ url: string, alt?: string }`** (string URLs, e.g. paths like `/placeholder.svg`).

| Collection | Folder | Required / notable fields | Copy-this example |
|--------------|--------|-----------------------------|-------------------|
| `posts` | `apps/web/src/content/posts/` | `title`, `description`, `pubDate`, `tags` (default `[]`), optional `image` | `apps/web/src/content/posts/1.md` |
| `teamMember` | `apps/web/src/content/team/` | `name`, optional `role`, `bio`, `image`, `socials[] { label, href }` | `apps/web/src/content/team/jordan-wells.md` |
| `legalPage` | `apps/web/src/content/legal/` | `page`, `pubDate` | `apps/web/src/content/legal/terms.md` |

**Where collections are used in code:** `getCollection("posts")` appears in **`apps/web/src/components/global/Search.astro`** only (Fuse.js client search over markdown posts). **Blog, team, legal, tags, and RSS pages do not use `getCollection` — they use Sanity** (next section).

**README mismatch:** The README’s “Content Types” and “Website Routes” tables describe authors, podcast, jobs, help center, etc. **Those routes and collections are not present under `apps/web/src/pages/` or `content.config.ts` in this repository.**

### B) Sanity CMS — `apps/studio/schemas/`

Registered in `apps/studio/schemas/index.ts` and surfaced in **`apps/studio/structure.ts`**:

| Schema | Conceptual overlap with collections |
|--------|-------------------------------------|
| `post` | Blog posts (`posts` collection) |
| `teamMember` | Team (`teamMember` collection) |
| `legalPage` | Legal (`legalPage` collection) |
| `siteSettings` | **No markdown equivalent** — singleton-style doc (`documentId` `siteSettings` in structure) for title, description, `siteUrl`, OG image, Twitter handle, navigation, footer, socials |

**Portable Text / images on the web:** `apps/web/src/lib/sanity/portableText.ts` (HTML + plain text), `image.ts` (`urlFor`, `getImageUrl` with `@sanity/image-url`), `queries.ts` (GROQ via `groq`), `transforms.ts` (`transformPost`, `transformTeamMember`, `transformLegalPage`), `fetch.ts` (`sanityFetch` + placeholder behavior), `types.ts` (Sanity + UI shapes).

**SEO:** `apps/web/src/components/fundations/head/Seo.astro` calls `sanityFetch(siteSettingsQuery)` for defaults (title suffix, description, canonical base `siteUrl`, OG image, Twitter handle) and uses `@lexingtonthemes/seo`’s `AstroSeo`.

### Toggle / env (actual code vs README)

- **There is no `USE_SANITY` flag or `apps/web/src/lib/data.ts` in this repo.** Data source selection is implicit: **pages use Sanity**; **search uses markdown `posts`**.
- **`apps/web/.env.example`:** `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION`, optional `SANITY_READ_TOKEN` (draft/preview; commented).
- **`apps/studio/.env.example`:** `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`.
- **`client.ts`** also reads `PUBLIC_SANITY_PROJECT_ID` and uses token `SANITY_READ_TOKEN` on the client for preview client.
- **`fetch.ts`:** If neither `SANITY_PROJECT_ID` nor `PUBLIC_SANITY_PROJECT_ID` is set, `sanityFetch` returns **empty results** so builds can succeed — **blog/team/legal/tag/RSS routes then render empty or 404-style flows**, while Search can still use local markdown.

**Collections-first workflow:** Works for **offline search sample data** without credentials; **fully functional blog/team/legal/RSS/tag pages require Sanity** project + dataset + published documents.

### Seeding / migration

- **`pnpm run seed:all` (root)** → `apps/studio/scripts/seed.mjs`: deletes all `post`, `teamMember`, `legalPage` documents (batched), cleans fixed ids, waits, then creates **one document per type**. Per script header: needs project id + dataset + write token (`SANITY_API_WRITE_TOKEN`, `SANITY_WRITE_TOKEN`, or `SANITY_TOKEN`) in `apps/studio/.env` or `apps/web/.env`. Matches README Step 5 narrative (token from Sanity project API).
- **`scripts/migrate-to-sanity.ts`:** Intended to push markdown + `apps/web/src/images` into Sanity; requires `SANITY_PROJECT_ID` from `apps/web/.env` and **`SSANITY_WRITE_TOKEN`** (as named in source). It implements migrations for **`author`, `podcast`, `job`, `helpCenter`** and post fields **not all present** in the current Studio schemas. **Treat as legacy / out of sync** with `apps/studio/schemas/` unless you extend schemas and paths accordingly.

---

## Routing (`apps/web/src/pages/`)

| Pattern | File | Notes |
|---------|------|--------|
| `/` | `index.astro` | Landing + Hero |
| `/blog` | `blog/index.astro` | Sanity posts |
| `/blog/posts/*` | `blog/posts/[...slug].astro` | Catch-all segment `slug` |
| `/blog/tags` | `blog/tags/index.astro` | Tag index from Sanity |
| `/blog/tags/:tag` | `blog/tags/[tag].astro` | Dynamic `[tag]` |
| `/team` | `team/index.astro` | Sanity team list |
| `/team/*` | `team/[...slug].astro` | Catch-all `slug` |
| `/legal/*` | `legal/[...slug].astro` | Catch-all `slug` |
| `/system/overview`, `colors`, `typography`, `buttons`, `link` | `system/*.astro` | Design reference |
| `/rss.xml` | `rss.xml.js` | RSS from Sanity posts |
| `/404` | `404.astro` | Error page |

**Not present in this repo:** dedicated routes for changelog, customers, integrations, help center, authors, podcast, jobs (despite README table).

---

## Customization (real files)

- **Site URL / canonical:** `apps/web/astro.config.mjs` (`site`); **`Seo.astro`** also uses `siteSettings.siteUrl` from Sanity when set (fallback `https://example.com` in code).
- **Brand tokens / typography:** `apps/web/src/styles/global.css` (`@theme`, fonts, accent/base palettes, Tailwind plugins).
- **Global chrome:** `apps/web/src/layouts/BaseLayout.astro` → `BaseHead`, `Navigation`, `Footer`; head building blocks under `components/fundations/head/`.
- **Nav/footer content:** `Navigation.astro` / `Footer.astro` are currently static strings; **`siteSettings`** fields for navigation/footer exist in Sanity and GROQ but are **not wired** into those components in this checkout.

---

## Commands

| Command | Use |
|---------|-----|
| `pnpm install` | Install all workspaces |
| `pnpm dev:web` | **Day-to-day site** — Astro dev server (`apps/web`, typically port 4321) |
| `pnpm dev:studio` | Sanity Studio (`apps/studio`, typically 3333) |
| `pnpm dev` | Both in parallel |
| `pnpm build:web` / `pnpm build:studio` | Production builds |
| `pnpm run seed:all` | Studio seed (see above) |
| `pnpm clean` | Packaging cleanup script |

---

## Guardrails

- **Do not rename `fundations/`** — spelling is intentional and referenced throughout imports.
- **Zod collection schemas ↔ consumers:** Changing `content.config.ts` without updating **`Search.astro`** (and any future `getCollection` users) breaks local search.
- **Sanity schemas ↔ web layer:** Coordinate `apps/studio/schemas/*` with `queries.ts`, `types.ts`, `transforms.ts`, and every page under `pages/` that imports `@/lib/sanity`.
- **Parity:** Transforms are written to mirror collection-like `data` shapes; keep markdown samples and Sanity documents conceptually aligned for easier future unification.
- **Minimal diffs:** Match existing patterns (`@/` imports, `sanityFetch` + `transform*` in pages).
- **Support links:** Use the same Lexington URLs as `README.md` (documentation, changelog, support, bundle). For Sanity account/project settings, README already points at `https://sanity.io/manage` — use that pattern when referencing project configuration.

---

## README note for contributors

The README still documents **`USE_SANITY` in `apps/web/src/lib/data.ts`** and extra content types/routes. **This tree implements Sanity-driven blog/team/legal + markdown collections for samples/search only.** Update the README when introducing a real unified `data.ts` or toggling behavior.
