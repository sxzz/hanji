# Repository Guidelines

## Project Structure & Module Organization

Hanji is a Nuxt 4/Vue 3 static site. Route components live in `app/pages/`, reusable UI in `app/components/`, stateful helpers in `app/composables/`, and global styling in `app/styles/`. Keep framework-independent data models and lookup logic in `shared/` so both the app and build scripts can import them. Data and font pipelines live in `scripts/`; their Vitest suites are in `scripts/tests/`. Generated datasets, stroke shards, and font subsets under `app/assets/` are ignored and fingerprinted by Vite; stable legal texts live under `public/notices/`. Downloaded inputs under `data/raw/` are also ignored. Do not hand-edit generated outputs; change the relevant script or source lock instead.

## Build, Test, and Development Commands

- `pnpm install` installs the pinned pnpm 11 dependencies and prepares Nuxt.
- `pnpm build:data` generates datasets and font subsets. Run it before tests or a clean production build; the first run downloads roughly 211 MB.
- `pnpm dev` starts the local Nuxt development server.
- `pnpm test` runs all Vitest tests once.
- `pnpm lint` checks TypeScript, Vue, and UnoCSS conventions.
- `pnpm typecheck` runs Nuxt's Vue-aware TypeScript checker.
- `pnpm format` formats the repository with the shared Prettier configuration.
- `pnpm generate` writes the deployable static site to `.output/public/`.

## Coding Style & Naming Conventions

Use TypeScript and Vue Composition API with `<script setup lang="ts">`. Follow the existing two-space, single-quote, no-semicolon style and let Prettier resolve formatting. Name Vue components in PascalCase (`CharTable.vue`), composables with a `use` prefix (`useQueryState`), and utility files in kebab-case. Prefer shared types over duplicated shapes, UnoCSS utilities for component styling, and locale entries in `app/locales/` for user-facing text.

## README Localizations

`README.md` is the Simplified Chinese source and `README.ja-JP.md` is its Japanese translation. Whenever either file changes, update the other in the same change. Keep their structure, facts, commands, links, and data-source tables synchronized.

## Testing Guidelines

Vitest discovers `scripts/tests/*.test.ts`. Add focused regression cases near the pipeline or utility being changed; use table-driven `it.each` cases for data variants. Dataset and font tests validate generated artifacts, so run `pnpm build:data` when inputs or generators change. No coverage threshold is configured; meaningful behavioral assertions are expected.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative subjects such as `Add Japanese localization support` and `Fix character route fallback redirects`. Use an optional `chore:` prefix only for maintenance work. Before committing, run `pnpm format`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`. Write GitHub content in English. Pull requests should explain intent and data-impact, link relevant issues, list verification commands, and include screenshots for visible UI changes. Commit updated lockfiles and generated datasets when applicable, but never ignored raw downloads or generated fonts.
