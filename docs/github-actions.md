# GitHub Actions Test Pipeline

This repository includes a comprehensive GitHub Actions pipeline for testing the BOM Manager Application.

## Workflows

### 1. Test Suite (`test.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests, Manual dispatch

**Features:**
- **Multi-Node Testing**: Tests against Node.js 18.x and 20.x
- **Comprehensive Checks**: 
  - Linting with ESLint
  - TypeScript type checking
  - Unit tests with coverage reporting
  - Build validation
  - Security audit

**Reports Generated:**
- Test results with detailed pass/fail information
- Code coverage reports (HTML, JSON, Text)
- Build artifacts validation
- Security vulnerability scanning

**PR Integration:**
- Automatic comments on PRs with test results
- Coverage summaries
- Failed test details with error messages

### 2. Error Analysis (`error-analysis.yml`)
**Triggers:** When Test Suite workflow fails

**Features:**
- **Failure Analysis**: Downloads and analyzes test artifacts
- **Automatic Issue Creation**: Creates GitHub issues for main branch failures
- **Performance Monitoring**: Tracks test execution times
- **Detailed Error Reports**: Provides comprehensive failure analysis

## Workflow Status

Add this badge to your README.md to show the current test status:

```markdown
[![Test Suite](https://github.com/Cannasol-Tech/BOM-Generator/actions/workflows/test.yml/badge.svg)](https://github.com/Cannasol-Tech/BOM-Generator/actions/workflows/test.yml)
```

## Test Configuration

The pipeline uses Vitest for testing with the following configuration:

- **Environment**: jsdom (for React component testing)
- **Coverage**: v8 provider with multiple output formats
- **Setup**: Custom test setup in `src/tests/setup.ts`
- **Reporters**: Verbose and JSON for detailed CI reporting

## Artifacts

Each workflow run generates the following artifacts:

1. **Test Results**: JSON files with detailed test execution data
2. **Coverage Reports**: HTML and JSON coverage reports
3. **Build Artifacts**: Production build outputs
4. **Performance Reports**: Test execution timing analysis

## Error Reporting

When tests fail, the pipeline provides:

1. **Immediate Feedback**: Failed tests shown in workflow summary
2. **PR Comments**: Detailed failure information in pull request comments
3. **GitHub Issues**: Automatic issue creation for main branch failures
4. **Artifact Downloads**: Full test results available for debugging

## Local Development

To run the same tests locally:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Build application
npm run build
```

## Troubleshooting

### Common Issues

1. **Test Failures**: Check the detailed error messages in the workflow output or PR comments
2. **Coverage Issues**: Review the coverage report artifacts
3. **Build Failures**: Check the build validation step for missing files
4. **Security Vulnerabilities**: Review the security audit results

### Getting Help

- Check workflow logs in the Actions tab
- Review test artifacts for detailed information
- Look for automatically created issues for main branch failures
- Review PR comments for test-specific feedback
