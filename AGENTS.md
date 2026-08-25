# Repository Guidelines

## Project Structure & Module Organization

Hanji is a Nuxt 4/Vue 3 static app. Route components live in `app/pages/`, reusable UI in `app/components/`, stateful helpers in `app/composables/`, and global styling in `app/styles/`. Keep framework-independent data models and lookup logic in `shared/` so both the app and build scripts can import them. Data and font pipelines live in `scripts/`; their Vitest suites are in `scripts/tests/`. Generated character data, stroke shards, and font subsets under `app/assets/` are ignored and fingerprinted by Vite; stable legal texts live under `public/notices/`. Downloaded inputs under `data/raw/` are also ignored. Do not hand-edit generated outputs; change the relevant script or source lock instead.

## Build, Test, and Development Commands

- `pnpm install` installs the pinned pnpm 11 dependencies and prepares Nuxt.
- `pnpm build:data` generates datasets and font subsets. Run it before tests or a clean production build; the first run downloads roughly 211 MB.
- `pnpm dev` starts the local Nuxt development server.
- `pnpm test` runs all Vitest tests once.
- `pnpm lint` checks TypeScript, Vue, and UnoCSS conventions.
- `pnpm typecheck` runs Nuxt's Vue-aware TypeScript checker.
- `pnpm format` formats the repository with the shared Prettier configuration.
- `pnpm generate` writes the deployable static app to `.output/public/`.

## Coding Style & Naming Conventions

Use TypeScript and Vue Composition API with `<script setup lang="ts">`. Follow the existing two-space, single-quote, no-semicolon style and let Prettier resolve formatting. Name Vue components in PascalCase (`CharTable.vue`), composables with a `use` prefix (`useQueryState`), and utility files in kebab-case. Prefer shared types over duplicated shapes, UnoCSS utilities for component styling, and locale entries in `app/locales/` for user-facing text.

Always write the project's English name as `Hanji` in user-facing copy and visual assets. Never style it as `HANJI` or `hanji`; lowercase `hanji` is reserved for technical identifiers such as package names, URLs, CSS classes, filenames, and storage keys.

## README Localizations

`README.md` is the Simplified Chinese source and `README.ja-JP.md` is its Japanese translation. Whenever either file changes, update the other in the same change. Keep their structure, facts, commands, links, and data-source tables synchronized.

## Testing Guidelines

Vitest discovers `scripts/tests/*.test.ts`. Add focused regression cases near the pipeline or utility being changed; use table-driven `it.each` cases for data variants. Dataset and font tests validate generated artifacts, so run `pnpm build:data` when inputs or generators change. No coverage threshold is configured; meaningful behavioral assertions are expected.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative subjects such as `Add Japanese localization support` and `Fix character route fallback redirects`. Use an optional `chore:` prefix only for maintenance work. Write all GitHub content in English. Commit updated lockfiles and generated datasets when applicable, but never ignored raw downloads or generated fonts.

### Required Checks Before Submission

Every contributor, including an AI coding agent, must run the following commands from the repository root after the final code change and before the final commit or PR submission:

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm format` can modify files, so review and include its output before running the remaining checks. On a clean checkout, or after changing dataset/font inputs or generators, run `pnpm build:data` before the checks above. If a later edit can affect a completed check, rerun that check. Do not claim that a command passed unless it was actually run to completion. Do not submit with known failures; if a check cannot run because of an environmental limitation, record the exact command and error in the PR's `Additional context` section.

### Pull Request Template

All PRs must follow the account-wide [pull request template](https://github.com/sxzz/.github/blob/main/.github/PULL_REQUEST_TEMPLATE.md). This requirement also applies when a PR is created through a CLI, an API, or an AI coding agent: explicitly load and preserve the template instead of replacing it with a custom PR body.

- Keep the `AI usage`, `Description`, `Linked Issues`, and `Additional context` sections.
- Complete the AI disclosure truthfully. If AI contributed to code, tests, documentation, commit messages, or the PR description, select `AI was used` and identify the tool and model in one short line.
- An AI agent must never check `I have carefully reviewed the AI-generated content myself`; only the human contributor may check it after personally reviewing the work.
- Keep the description concise and explain what problem the PR solves. Link the relevant issue and add focused regression tests when appropriate.
- List the commands actually run and their results in `Additional context`. Include screenshots for visible UI changes, or state that they are not applicable.
