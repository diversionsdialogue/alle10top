# Lexington Sanity & Astro Starter - Setup Guide

## After Cloning the Template

### 1. Open Project in VS Code

Open the project folder in VS Code (or your preferred editor). All commands should be run from the **root folder** of the project.

### 2. Install pnpm (if you don't have it)

```bash
npm install -g pnpm
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Create Sanity Project

1. Go to https://sanity.io/manage
2. Log in or create account
3. Click "Create project"
4. Name it anything you want
5. Select Free plan
6. Copy the **Project ID** (looks like `abc123xy`)

### 5. Create Environment Files

**Website env file:**

```bash
cp apps/web/.env.example apps/web/.env
```

Open `apps/web/.env` and paste:

```
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
```

**Studio env file:**

```bash
cp apps/studio/.env.example apps/studio/.env
```

Open `apps/studio/.env` and paste:

```
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
```

Replace `your-project-id` with your actual Project ID from step 4.

### 6. Start Development

```bash
pnpm dev
```

This opens:

- Website: http://localhost:4321
- CMS: http://localhost:3333

### 7. Add Content

1. Go to http://localhost:3333
2. Create your content (blog posts, team members, etc.)
3. Click **Publish** on each item
4. See it appear on http://localhost:4321

---

## Quick Reference

| Command           | What it does                    |
| ----------------- | ------------------------------- |
| `pnpm install`    | Install everything              |
| `pnpm dev`        | Start both website + CMS        |
| `pnpm dev:web`    | Start only website              |
| `pnpm dev:studio` | Start only CMS                  |
| `pnpm build`      | Build for production            |
| `pnpm clean`      | Clean up before zipping/sharing |

---

## Folder Structure

```
your-project/
├── apps/
│   ├── web/         ← Astro website
│   └── studio/      ← Sanity CMS
├── scripts/         ← Utility scripts
├── package.json
└── pnpm-workspace.yaml
```

---

## If Something Goes Wrong

**"Cannot find module" error:**

```bash
pnpm install
```

**Content not showing:**

- Make sure you clicked "Publish" in the CMS

**CORS error:**

- Go to sanity.io/manage → Your Project → API → CORS Origins
- Add `http://localhost:4321`
