# Pizza Tool

A SvelteKit application for pizza recipe management with baker's percentage calculator, timers, and reference materials.

## Features

- 📊 Baker's percentage calculator
- ⏱️ Multiple timer management
- 📚 Recipe library
- 📖 Reference materials (flour types, sauces, tips)
- 📱 Progressive Web App (PWA) support

### PWA install support

- The in-app install banner relies on the `beforeinstallprompt` event, which is available in Chromium-based browsers (Chrome, Edge, Brave) and will surface when the app meets install criteria.
- Firefox for Android does not fire `beforeinstallprompt`, so the banner will not appear there. Users can still install via Firefox's menu (⋮) → Add to Home screen/Install; the manifest and service worker continue to work after installation.

## Development

Once you've installed dependencies with `npm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Testing

This project uses two types of tests:

### Unit Tests (Vitest)

Unit tests are for testing pure logic and utilities without browser dependencies.

```sh
# Run unit tests once
npm run test
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with UI
npm run test:unit:ui

# Run unit tests with coverage
npm run test:unit:coverage
```

### End-to-End Tests (Playwright)

E2E tests run in real browsers (Chromium and Firefox) to test user interactions.

```sh
# Run all e2e tests (both Chromium and Firefox)
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in Chromium only
npm run test:e2e:chromium

# Run e2e tests in Firefox only
npm run test:e2e:firefox
```

**Note**: E2E tests require building the app first. The test script automatically builds and starts a preview server.

## Code Quality

### Linting

```sh
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

### Formatting

```sh
# Check code formatting
npm run format:check

# Format code automatically
npm run format
```

### Type Checking

```sh
# Run TypeScript type checking
npm run check

# Run type checking in watch mode
npm run check:watch
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Deployment

This project is configured for static deployment. The app uses client-side rendering (CSR) with no server-side rendering (SSR).

### GitHub Pages Setup

1. Go to your repository settings
2. Navigate to Pages section
3. Set Source to "GitHub Actions"
4. The deployment will happen automatically via the `.github/workflows/deploy.yml` workflow

The site will be available at: `https://<username>.github.io/<repository-name>/`

**Note**: The app uses CSR, so all routing is handled client-side. The static adapter is configured with a fallback to `index.html` for proper SPA routing.

## CI/CD

This project uses GitHub Actions for continuous integration:

- **CI Workflow** (`.github/workflows/ci.yml`): Runs on every push and pull request
  - Linting
  - Formatting checks
  - Type checking
  - Unit tests
  - E2E tests (Chromium and Firefox)
  - Build verification

- **Deploy Workflow** (`.github/workflows/deploy.yml`): Deploys to GitHub Pages on pushes to main/master
  - Builds the application
  - Deploys to GitHub Pages

- **Dependabot Auto-Merge** (`.github/workflows/dependabot-auto-merge.yml`): Automatically merges safe dependency updates
  - Auto-merges patch and minor updates after CI passes
  - Requires manual review for major updates
  - Adds comments explaining merge status

- **Visual Comparison** (`.github/workflows/visual-comparison.yml`): Captures before/after screenshots for UI changes
  - Takes screenshots of both base and PR versions
  - Embeds images directly in PR comments
  - Creates side-by-side comparison tables

## Dependency Management

This project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) for automated dependency updates:

- **NPM packages** are checked weekly and grouped by type (dev/production dependencies)
- **GitHub Actions** are checked weekly and grouped together
- **Auto-merge enabled** for patch and minor updates (safe updates only)
- **Manual review required** for major updates (breaking changes)

See [DEPENDABOT_GUIDE.md](./DEPENDABOT_GUIDE.md) for detailed configuration and customization options.

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/    # Svelte components
│   │   ├── data/          # Static data files
│   │   ├── stores/        # Svelte stores
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions (with unit tests)
│   ├── routes/            # SvelteKit routes (CSR only, no SSR)
│   └── tests/
│       ├── unit/          # Unit tests (Vitest)
│       └── e2e/           # End-to-end tests (Playwright)
├── static/                # Static assets
└── .github/
    └── workflows/         # CI/CD workflows
```

## Technologies

- [SvelteKit](https://kit.svelte.dev/) - Application framework (static adapter, CSR only)
- [Svelte 5](https://svelte.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vitest](https://vitest.dev/) - Unit testing framework
- [Playwright](https://playwright.dev/) - E2E testing (Chromium & Firefox)
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting
- [GitHub Actions](https://github.com/features/actions) - CI/CD

## Baker's Percentage Calculations

The app includes comprehensive unit tests for baker's percentage calculations:

- Basic ingredient weight calculations
- Total flour calculations for target dough weights
- Recipe scaling for any number of pizzas
- Support for predough stages (poolish, biga, autolyse)
- Adjustable predough percentages (e.g., 100% → 50% → 30%)
- Hydration calculations
- Recipe validation

All calculations are thoroughly tested with 33 unit tests covering various scenarios including complex multi-stage recipes.

TODO:

- Add a planner funtion, where you can put in a dissired time for the doughs to be ready.
  Then the timer will prompt when to start
- Some steps in the timeline references the dough ball weight, we should make that dynamic
- Kneading times right now use lower bound, maybe we need a way to support ranges for duration?
  Would also be neat to add machine type or specific machines kneading time in the future
