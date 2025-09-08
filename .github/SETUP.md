# GitHub Actions Setup Guide

This project uses GitHub Actions for CI/CD. To enable automatic NPM publishing, you need to configure the following secrets in your GitHub repository.

## Required Secrets

### NPM_TOKEN

1. Go to [npmjs.com](https://www.npmjs.com) and log in to your account
2. Click on your profile picture → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Publish" permissions
5. Copy the generated token
6. In your GitHub repository, go to Settings → Secrets and variables → Actions
7. Click "New repository secret"
8. Name: `NPM_TOKEN`
9. Value: Paste your NPM token
10. Click "Add secret"

## Workflows Overview

### Test Workflow (`test.yml`)
- **Triggers**: Push to main/develop, Pull Requests to main
- **Matrix**: Tests on Ubuntu, macOS, Windows with Node.js 16.x, 18.x, 20.x
- **Steps**: 
  - Install dependencies
  - Build project
  - Run unit tests
  - Run E2E tests
  - Upload coverage reports

### Publish Workflow (`publish.yml`)
- **Triggers**: 
  - Push to main branch (when package.json version changes)
  - Manual trigger with version bump option
- **Steps**:
  - Run tests
  - Check version changes
  - Publish to NPM (if version changed)
  - Create GitHub release

## Usage

### Automatic Publishing
1. Update your code
2. Bump version in package.json:
   ```bash
   npm run version:patch  # 0.1.1 → 0.1.2
   npm run version:minor  # 0.1.1 → 0.2.0
   npm run version:major  # 0.1.1 → 1.0.0
   ```
3. Commit and push to main branch
4. GitHub Actions will automatically publish to NPM

### Manual Release
1. Go to Actions tab in GitHub
2. Select "Publish to NPM" workflow
3. Click "Run workflow"
4. Select version type (patch/minor/major)
5. Click "Run workflow"

## Development Commands

```bash
# Version management
npm run version:patch    # Bump patch version
npm run version:minor    # Bump minor version  
npm run version:major    # Bump major version

# Release (version + push + trigger publish)
npm run release:patch    # Release patch version
npm run release:minor    # Release minor version
npm run release:major    # Release major version

# Testing
npm test                 # Run all tests
npm run test:unit        # Run unit tests only
npm run test:e2e         # Run E2E tests only
npm run test:coverage    # Run tests with coverage
```

## Troubleshooting

### NPM Publish Failed
- Check if NPM_TOKEN secret is correctly set
- Verify your npm account has publish permissions for the package
- Ensure package version in package.json is higher than published version

### Tests Failed
- Check Node.js version compatibility
- Verify all dependencies are correctly installed
- Review test output for specific errors

### Manual Override
If automatic publishing fails, you can always publish manually:
```bash
npm run build
npm publish
```