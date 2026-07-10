#!/bin/bash

# Clean script for preparing theme for distribution
# Run with: pnpm clean

echo "🧹 Cleaning project for distribution..."

# Remove node_modules
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/studio/node_modules
rm -rf scripts/node_modules
echo "   ✓ Removed node_modules"

# Remove .env files (keep .env.example)
rm -f apps/web/.env
rm -f apps/studio/.env
echo "   ✓ Removed .env files"

# Remove build outputs and caches
rm -rf dist
rm -rf .astro
rm -rf .sanity
rm -rf apps/web/dist
rm -rf apps/web/.astro
rm -rf apps/studio/dist
echo "   ✓ Removed build outputs and caches"

# Remove lock file (optional - comment out if you want to keep it)
# rm -f pnpm-lock.yaml
# echo "   ✓ Removed lock file"

echo ""
echo "✅ Clean complete! Ready to zip."
echo ""
echo "📦 To zip (from parent folder):"
echo "   zip -r theme-name.zip your-folder-name -x '*.git*'"
