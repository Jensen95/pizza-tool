# Pizza Tool

A SvelteKit application for pizza recipe management with baker's percentage calculator, timers, and reference materials.

## Features

- 📊 Baker's percentage calculator
- ⏱️ Multiple timer management
- 📚 Recipe library
- 📖 Reference materials (flour types, sauces, tips)
- 📱 Progressive Web App (PWA) support

## Development

Once you've installed dependencies with `npm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Testing

Run tests with Vitest:

```sh
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

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

This project is configured for deployment to GitHub Pages. The deployment happens automatically when changes are pushed to the `main` or `master` branch.

### GitHub Pages Setup

1. Go to your repository settings
2. Navigate to Pages section
3. Set Source to "GitHub Actions"
4. The deployment will happen automatically via the `.github/workflows/deploy.yml` workflow

The site will be available at: `https://<username>.github.io/pizza-tool/`

## CI/CD

This project uses GitHub Actions for continuous integration:

- **CI Workflow** (`.github/workflows/ci.yml`): Runs on every push and pull request
  - Linting
  - Formatting checks
  - Type checking
  - Tests
  - Build verification

- **Deploy Workflow** (`.github/workflows/deploy.yml`): Deploys to GitHub Pages on pushes to main/master
  - Builds the application
  - Deploys to GitHub Pages

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/    # Svelte components
│   │   ├── data/          # Static data files
│   │   ├── stores/        # Svelte stores
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── routes/            # SvelteKit routes
│   └── tests/             # Test files
├── static/                # Static assets
└── .github/
    └── workflows/         # CI/CD workflows
```

## Technologies

- [SvelteKit](https://kit.svelte.dev/) - Application framework
- [Svelte 5](https://svelte.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vitest](https://vitest.dev/) - Testing framework
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting
- [GitHub Actions](https://github.com/features/actions) - CI/CD
