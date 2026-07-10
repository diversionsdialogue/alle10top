#!/usr/bin/env bash
# Ploi-deployscript Alle10top (plakken in Ploi → Sites → alle10top.nl → Deploy script)
#
# Vereist op de server: Node 22 (Ploi-standaard) — pnpm komt via corepack.
# Sanity: alleen niet-geheime buildvariabelen horen hier (project-ID, dataset).
# De write-token is uitsluitend voor de eenmalige migratie vanaf de lokale
# machine en hoort nooit op de server of in de repo.

cd /home/ploi/alle10top.nl || exit 1
set -e

# --- buildvariabelen (niet geheim) ---
# Invullen zodra het Sanity-project bestaat; tot die tijd bouwt de site
# uit de markdown-content in de repo (USE_SANITY=false).
export USE_SANITY=false
export SANITY_PROJECT_ID=
export SANITY_DATASET=production

git pull origin main

# pnpm via corepack in de home-dir (de ploi-gebruiker mag niet in /usr/bin)
mkdir -p "$HOME/.local/bin"
corepack enable --install-directory "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
corepack prepare pnpm@9.15.0 --activate

pnpm install --frozen-lockfile
pnpm build:web

echo "🚀 Application deployed!"
