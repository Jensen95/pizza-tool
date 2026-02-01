# Pizza Tool - GitHub Copilot Instructions

## Project Overview

Pizza Tool is a SvelteKit-based Progressive Web App (PWA) for pizza recipe management. It provides baker's percentage calculations, timer management, recipe libraries, and reference materials for pizza making.

**Key Features:**

- Baker's percentage calculator with support for multi-stage dough recipes (poolish, biga, autolyse)
- Multiple timer management for different pizza-making stages
- Recipe library with customizable ingredients
- Reference materials for flour types, sauces, and pizza-making tips
- Client-side rendering (CSR) only - no server-side rendering

## Tech Stack

- **Framework:** SvelteKit with static adapter (CSR only, no SSR)
- **UI Library:** Svelte 5 (using runes syntax)
- **Language:** TypeScript (strict mode enabled)
- **Testing:**
  - Unit Tests: Vitest with happy-dom
  - E2E Tests: Playwright (Chromium and Firefox)
- **Code Quality:**
  - ESLint with TypeScript and Svelte plugins
  - Prettier with Svelte plugin
  - TypeScript strict mode
- **CI/CD:** GitHub Actions
- **Node Version:** >= 20.0.0

## Coding Standards

### TypeScript

- Use strict TypeScript mode - all code must be properly typed
- Avoid using `any` type - use proper types or `unknown` when necessary
- Define interfaces and types in `src/lib/types/` directory
- Use type imports: `import type { Recipe } from '$lib/types/recipe'`

### Svelte Components

- Use Svelte 5 runes syntax (`$state`, `$derived`, `$effect`, `$props`)
- Prefer functional/composition patterns over class-based components
- All components are `.svelte` files in `src/lib/components/`
- Use TypeScript in script blocks: `<script lang="ts">`

### Code Style

- Use tabs for indentation (configured in Prettier)
- Single quotes for strings
- No trailing commas
- 100 character line length limit
- Use named exports over default exports

### File Organization

```
src/
├── lib/
│   ├── components/     # Svelte components (organized by feature)
│   │   ├── recipe/
│   │   ├── reference/
│   │   ├── timer/
│   │   └── ui/
│   ├── data/          # Static data files
│   ├── stores/        # Svelte stores (writable, readable, derived)
│   ├── types/         # TypeScript interfaces and types
│   └── utils/         # Utility functions (must have unit tests)
├── routes/            # SvelteKit routes (CSR only)
└── tests/
    ├── unit/          # Unit tests with Vitest
    └── e2e/           # E2E tests with Playwright
```

## Development Guidelines

### State Management

- Use Svelte stores in `src/lib/stores/` for shared state
- Use Svelte 5 runes (`$state`, `$derived`) for component-local state
- All stores should be properly typed

### Testing Requirements

- **Unit tests are required** for all utility functions in `src/lib/utils/`
- Place unit tests in `src/tests/unit/` with `.test.ts` extension
- Use descriptive test names: `describe()` and `test()` or `it()`
- E2E tests in `src/tests/e2e/` should cover critical user workflows
- Run tests before committing code

### Baker's Percentage Calculations

- All baker's percentage logic is in `src/lib/utils/baker-percentage.ts`
- This module has comprehensive unit tests (33 tests) - do not break them
- Supports multi-stage dough recipes (poolish, biga, autolyse)
- All calculations use flour as 100% baseline

### SvelteKit Configuration

- Static adapter is configured - no SSR functionality
- All rendering happens client-side
- Routes use `+page.svelte` (no `+page.server.ts` files)
- Use `$lib` alias for imports: `import { ... } from '$lib/...'`

## Build & Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests
npm run test:unit:watch  # Unit tests in watch mode
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # E2E tests with UI

# Code Quality
npm run lint             # Check for lint errors
npm run lint:fix         # Fix lint errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
npm run check            # TypeScript type checking
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration. All pull requests must pass the following checks before merging:

### CI Checks (in order)

1. **Linting** - `npm run lint` - ESLint checks for code quality issues
2. **Formatting** - `npm run format:check` - Prettier checks code formatting
3. **Type Checking** - `npm run check` - TypeScript strict type checking
4. **Unit Tests** - `npm run test:unit` - Run all unit tests with Vitest
5. **Build** - `npm run build` - Verify production build succeeds
6. **E2E Tests** - `npm run test:e2e` - Run end-to-end tests with Playwright

### Running CI Checks Locally

Before pushing code or requesting review, run all CI checks locally:

```bash
# Run all checks in sequence (same as CI)
npm run lint && npm run format:check && npm run check && npm run test:unit && npm run build && npm run test:e2e

# Or run individually to debug failures
npm run lint           # Check linting
npm run format:check   # Check formatting
npm run check          # Check TypeScript types
npm run test:unit      # Run unit tests
npm run build          # Build for production
npm run test:e2e       # Run E2E tests (requires successful build)
```

### Fixing Common CI Failures

- **Linting errors**: Run `npm run lint:fix` to auto-fix most issues
- **Formatting errors**: Run `npm run format` to auto-format all files
- **Type errors**: Fix TypeScript errors manually, `npm run check` will show details
- **Test failures**: Review test output and fix the failing tests
- **Build failures**: Check for compilation errors in the build output
- **E2E failures**: Review Playwright test output and screenshots in CI artifacts

## Important Conventions

### DO:

- Use tabs for indentation, not spaces
- Type all function parameters and return values
- Write unit tests for utility functions
- Use Svelte 5 runes syntax in components
- Keep components small and focused
- Use descriptive variable and function names
- Run lint and format before committing
- **Run CI checks locally before pushing** (`npm run lint && npm run format:check && npm run check && npm run test:unit`)

### DON'T:

- Don't use SSR features (this is a CSR-only app)
- Don't use default exports
- Don't use `any` type
- Don't skip type checking or tests
- Don't remove or modify existing unit tests without good reason
- Don't create class-based components (use functional patterns)
- **Don't push code without running CI checks locally first**

## PWA Considerations

- Service worker is configured via Vite PWA plugin
- Static assets go in `static/` directory
- App is designed to work offline with cached resources

## Deployment

- Deployed to GitHub Pages via GitHub Actions
- Build creates static files in `build/` directory
- Base path may be configured for GitHub Pages deployment
