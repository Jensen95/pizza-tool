# GitHub Pages Setup Instructions

## Overview

This project is now configured for automatic deployment to GitHub Pages. Follow these steps to complete the setup.

## Prerequisites

- Repository must be public (or have GitHub Pages enabled for private repos with GitHub Pro)
- You need admin access to the repository

## Setup Steps

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository on GitHub: `https://github.com/Jensen95/pizza-tool`
2. Click on **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

That's it! The deployment workflow is already configured.

### 2. Verify the Deployment

After merging this PR to the main/master branch:

1. Go to the **Actions** tab in your repository
2. You should see the "Deploy to GitHub Pages" workflow running
3. Once complete, your site will be available at: `https://jensen95.github.io/pizza-tool/`

### 3. Future Deployments

The site will automatically redeploy whenever you push changes to the main/master branch.

## Manual Deployment (Optional)

You can also trigger a deployment manually:

1. Go to the **Actions** tab
2. Click on "Deploy to GitHub Pages" workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Local Testing

Before pushing to GitHub, you can test the production build locally:

```bash
# Build the site
npm run build

# Preview the production build
npm run preview
```

## Troubleshooting

### Site not loading or 404 errors

- Ensure GitHub Pages is enabled and set to "GitHub Actions" as the source
- Check that the workflow completed successfully in the Actions tab
- Wait a few minutes for GitHub Pages to update (it can take 5-10 minutes)

### Build fails in GitHub Actions

- Check the workflow logs in the Actions tab
- Ensure all dependencies are in package.json
- Run `npm run build` locally to test

### Wrong base path

- The base path is set to `/pizza-tool/` in `svelte.config.js`
- If your repository has a different name, update the `paths.base` value

## CI/CD Pipeline

Every pull request and push will run:

- ✅ ESLint (code linting)
- ✅ Prettier (formatting check)
- ✅ TypeScript type checking
- ✅ Vitest tests
- ✅ Production build verification

You can see the status in the PR checks or the Actions tab.

## Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run dev -- --open  # Start dev server and open browser

# Testing
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Check for linting errors
npm run lint:fix     # Fix linting errors
npm run format       # Format all files
npm run format:check # Check formatting
npm run check        # TypeScript type checking
npm run check:watch  # Type checking in watch mode

# Building
npm run build        # Build for production
npm run preview      # Preview production build
```

## Next Steps

1. Merge this PR to your main branch
2. Follow the GitHub Pages setup steps above
3. Wait for the deployment to complete
4. Visit your site at https://jensen95.github.io/pizza-tool/

Enjoy your automated pizza tool deployment! 🍕
