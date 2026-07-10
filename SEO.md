# SEO Setup Guide

This starter template includes a complete SEO system that pulls data from Sanity CMS.

## How It Works

### 1. Global SEO Settings (from Sanity)

In Sanity Studio (`/admin`), go to **Site Settings** to configure:

| Field                | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| **Site Title**       | Your website name (e.g., "Lexington Themes")                     |
| **Site Description** | Default meta description for pages without one                   |
| **Site URL**         | Full URL (e.g., `https://example.com`) - used for canonical URLs |
| **Default OG Image** | Fallback image for social sharing (1200x630px recommended)       |
| **Twitter Handle**   | Your Twitter/X username (e.g., `@lexington`)                     |

### 2. Per-Page SEO (automatic)

Each content type automatically generates SEO meta tags:

**Blog Posts:**

- Title: `{Post Title} | {Site Title}`
- Description: Post excerpt/description
- Image: Post cover image
- Type: `article` (with publish date)

**Team Members:**

- Title: `{Name} | {Site Title}`
- Description: Bio text
- Image: Team member photo

**Legal Pages:**

- Title: `{Page Name} | {Site Title}`
- `noindex` enabled (excluded from search engines)

### 3. The SEO Component

Located at: `src/components/fundations/head/Seo.astro`

```astro
<Seo
  title="Page Title"           // Optional - falls back to site title
  description="Page desc"      // Optional - falls back to site description
  image={{ url, alt }}         // Optional - falls back to default OG image
  type="website"               // "website" or "article"
  publishedTime="2024-01-15"   // For articles only
  noindex={false}              // Set true to exclude from search
/>
```

### 4. Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Sanity CMS                           │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │Site Settings │    │ Blog Post    │                   │
│  │- title       │    │- title       │                   │
│  │- description │    │- description │                   │
│  │- ogImage     │    │- image       │                   │
│  │- twitterHandle│   │- pubDate     │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
└─────────┼───────────────────┼───────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Seo.astro                             │
│  - Fetches site settings for defaults                   │
│  - Receives page-specific props from layout             │
│  - Merges: page values override site defaults           │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                   HTML Output                           │
│  <title>Post Title | Site Title</title>                 │
│  <meta name="description" content="...">               │
│  <meta property="og:image" content="...">              │
│  <meta property="og:type" content="article">           │
│  <meta name="twitter:card" content="summary_large_image">│
└─────────────────────────────────────────────────────────┘
```

## Generated Meta Tags

For a blog post, the SEO component generates:

```html
<!-- Basic -->
<title>Getting Started with Astro | My Website</title>
<meta name="description" content="Learn how to build modern websites..." />
<link rel="canonical" href="https://example.com/blog/posts/1" />

<!-- Open Graph (Facebook, LinkedIn, etc.) -->
<meta property="og:title" content="Getting Started with Astro | My Website" />
<meta
  property="og:description"
  content="Learn how to build modern websites..."
/>
<meta property="og:url" content="https://example.com/blog/posts/1" />
<meta property="og:image" content="https://cdn.sanity.io/images/..." />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="My Website" />
<meta property="article:published_time" content="2024-01-15T00:00:00Z" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@lexington" />
<meta name="twitter:title" content="Getting Started with Astro | My Website" />
<meta
  name="twitter:description"
  content="Learn how to build modern websites..."
/>
<meta name="twitter:image" content="https://cdn.sanity.io/images/..." />
```

## Customizing SEO for New Pages

To add SEO to a custom page, pass the `seo` prop to `BaseLayout`:

```astro
---
import BaseLayout from "@/layouts/BaseLayout.astro";

const seo = {
  title: "My Custom Page",
  description: "Description for this page",
  image: {
    url: "https://example.com/my-image.jpg",
    alt: "Image description"
  },
  noindex: false,
};
---

<BaseLayout seo={seo}>
  <!-- Your content -->
</BaseLayout>
```

## Adding SEO Fields to Content Types

If you need custom SEO fields (like `metaTitle` that differs from `title`), add them to the Sanity schema:

```typescript
// In apps/studio/schemas/post.ts
defineField({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      description: "Override the default title for search engines",
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      description: "Override the default description",
    }),
    defineField({
      name: "ogImage",
      title: "Social Image",
      type: "image",
      description: "Override the cover image for social sharing",
    }),
  ],
}),
```

Then update your page to use those fields:

```astro
const seo = {
  title: post.seo?.metaTitle || post.title,
  description: post.seo?.metaDescription || post.description,
  image: post.seo?.ogImage || post.image,
};
```

## Testing SEO

Use these tools to verify your meta tags:

- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
- **Google Rich Results**: https://search.google.com/test/rich-results
