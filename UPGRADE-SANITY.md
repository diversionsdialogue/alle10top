# Upgrade Sanity to v5

## Prompt for Claude Code

Copy and paste this prompt:

---

**Upgrade Sanity Studio to v5 with React 19**

Sanity v5 was released December 16, 2025. The only breaking change is that it now requires React 19.2 instead of React 18. Schemas, plugins, and customizations work exactly as before.

Please upgrade the Sanity Studio in `apps/studio` to the latest version:

1. In `apps/studio`, update the dependencies:

   ```
   pnpm add react@latest react-dom@latest sanity@latest @sanity/vision@latest @sanity/icons@latest
   pnpm add -D @types/react@latest
   ```

2. Run `pnpm install` from the workspace root to update the lockfile

3. Start the studio with `pnpm dev` to verify it works without errors

The upgrade should result in:

- `sanity`: ^5.x.x
- `react` and `react-dom`: ^19.2.x
- `@sanity/vision`: ^5.x.x
- `@types/react`: ^19.x.x

No code changes should be needed since this starter uses standard Sanity patterns.

---

## Manual Steps

If you prefer to do it manually:

```bash
cd apps/studio
pnpm add react@latest react-dom@latest sanity@latest @sanity/vision@latest @sanity/icons@latest
pnpm add -D @types/react@latest
cd ../..
pnpm install
```

Then verify:

```bash
cd apps/studio
pnpm dev
```

## Reference

- [Sanity Studio v5: Embracing React 19](https://www.sanity.io/blog/sanity-studio-v5-react-19)
