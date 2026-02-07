# Dependabot Configuration Guide

This document explains the Dependabot setup for the pizza-tool repository.

## Overview

Dependabot is configured to automatically monitor and update dependencies in this repository. It handles both NPM packages and GitHub Actions.

## Features

### 1. Automated Dependency Updates

Dependabot will:

- Check for NPM package updates weekly (Mondays at 3:00 AM UTC)
- Check for GitHub Actions updates weekly (Mondays at 3:00 AM UTC)
- Create pull requests for dependency updates
- Group related dependencies together to reduce PR noise

### 2. Auto-Merge for Safe Updates

The repository is configured to **automatically merge** Dependabot PRs for:

- ✅ **Patch updates** (e.g., 1.0.0 → 1.0.1) - Bug fixes
- ✅ **Minor updates** (e.g., 1.0.0 → 1.1.0) - New features (backward compatible)

The repository requires **manual review** for:

- ⚠️ **Major updates** (e.g., 1.0.0 → 2.0.0) - Breaking changes

### 3. Test Suite Protection

Auto-merge is safe because:

- **46 unit tests** covering core functionality (baker's percentage calculations)
- **2 E2E tests** covering critical user workflows
- **Comprehensive CI pipeline** running on every PR:
  - Linting (ESLint)
  - Formatting (Prettier)
  - Type checking (TypeScript)
  - Unit tests (Vitest)
  - Build verification
  - E2E tests (Playwright)

Auto-merge will only occur **after all CI checks pass**.

### 4. Visual Comparison (Bonus Feature)

For PRs that modify the UI, a visual comparison workflow will:

- Build both the PR branch and base branch
- Capture screenshots of key pages
- Upload artifacts for manual comparison
- Comment on the PR with instructions

## Configuration Files

### `.github/dependabot.yml`

Main Dependabot configuration file that defines:

- Update schedules
- Dependency grouping
- Labels and commit message conventions

**NPM Dependencies are grouped as:**

- `dev-dependencies`: All development dependencies (grouped for easier review)
- `production-dependencies`: Production dependencies

**GitHub Actions are grouped as:**

- `github-actions`: All action updates in a single PR

### `.github/workflows/dependabot-auto-merge.yml`

Workflow that automatically merges Dependabot PRs:

- Runs only on Dependabot PRs
- Checks the update type (patch, minor, major)
- Enables auto-merge for patch and minor updates
- Adds a comment explaining the action taken

### `.github/workflows/visual-comparison.yml`

Workflow that captures before/after screenshots:

- Runs on all PRs
- Builds both base and PR versions
- Takes screenshots using Playwright
- **Embeds screenshots directly in PR comments** for easy side-by-side comparison
- Uses base64 encoding to display images inline

## How It Works

### For Patch and Minor Updates

1. Dependabot creates a PR
2. CI checks run automatically
3. `dependabot-auto-merge.yml` workflow detects the PR
4. Auto-merge is enabled with a comment
5. Once CI passes, the PR is automatically merged
6. Dependencies are updated without manual intervention

### For Major Updates

1. Dependabot creates a PR
2. CI checks run automatically
3. `dependabot-auto-merge.yml` adds a warning comment
4. PR requires **manual review and approval**
5. Reviewer checks for breaking changes
6. Reviewer manually merges after verification

## Monitoring Dependabot

### View Dependabot Status

Navigate to:

```
Repository → Insights → Dependency graph → Dependabot
```

### Manually Trigger Updates

You can manually trigger Dependabot updates:

1. Go to the Dependabot tab in your repository
2. Click "Check for updates" on any ecosystem

### Reviewing Dependabot PRs

All Dependabot PRs include:

- **Labels**: `dependencies`, `npm` or `github-actions`
- **Commit message**: Follows conventional commits (`chore(deps): ...`)
- **Metadata**: Update type, package name, version change
- **Release notes**: Links to changelogs when available

## Security

### Vulnerability Updates

Dependabot also monitors for security vulnerabilities:

- Creates PRs for security updates immediately (not on schedule)
- These are **always** labeled with `security`
- Consider manual review even for patch updates with security fixes

### Permissions

The auto-merge workflow requires:

- `contents: write` - To merge PRs
- `pull-requests: write` - To comment and enable auto-merge

These are scoped to the workflow only.

## Customization

### Changing Update Schedule

Edit `.github/dependabot.yml`:

```yaml
schedule:
  interval: 'daily' # Options: daily, weekly, monthly
  day: 'monday' # For weekly: monday-sunday
  time: '03:00' # 24-hour format
  timezone: 'UTC'
```

### Disabling Auto-Merge

To disable auto-merge while keeping Dependabot:

1. Delete or disable `.github/workflows/dependabot-auto-merge.yml`
2. Dependabot will still create PRs but won't merge them

### Adjusting Auto-Merge Rules

Edit `.github/workflows/dependabot-auto-merge.yml`:

```yaml
# Example: Only auto-merge patch updates
if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
```

### Adding More Dependency Groups

Edit `.github/dependabot.yml`:

```yaml
groups:
  testing-dependencies:
    patterns:
      - '@playwright/*'
      - '@testing-library/*'
      - 'vitest'
    update-types:
      - 'minor'
      - 'patch'
```

## Best Practices

1. **Monitor Auto-Merged PRs**: Review the commit history weekly to catch any issues
2. **Test Locally**: If CI passes but you notice issues, add more tests
3. **Update Grouping**: Adjust groups if too many/few dependencies are grouped together
4. **Security First**: Always review security updates, even patch versions
5. **Keep CI Fast**: Slow CI delays auto-merge; optimize test suite as needed

## Troubleshooting

### Dependabot Not Creating PRs

- Check if updates are available in the Dependabot dashboard
- Verify `.github/dependabot.yml` syntax
- Check if `open-pull-requests-limit` is reached

### Auto-Merge Not Working

- Verify the PR is from `dependabot[bot]`
- Check if CI has passed
- Ensure repository settings allow auto-merge
- Review workflow run logs for errors

### Too Many Dependabot PRs

- Reduce `open-pull-requests-limit` in `dependabot.yml`
- Increase grouping patterns to combine more updates
- Change schedule to `monthly` instead of `weekly`

## Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Auto-merge Documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
