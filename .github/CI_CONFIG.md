# CI/CD Configuration for BOM Manager

## Environment Variables

The following environment variables can be set in GitHub repository secrets:

- `NODE_OPTIONS`: Additional Node.js options (e.g., `--max-old-space-size=4096`)
- `VITE_*`: Vite environment variables for different deployment environments

## Test Configuration

### Vitest Setup
The test suite uses Vitest with the following key configurations:

```typescript
// vite.config.ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/tests/setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'json-summary', 'html'],
    exclude: [
      'node_modules/',
      'src/tests/',
      '**/*.d.ts',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.config.{ts,js}',
      'dist/'
    ]
  }
}
```

### Test Scripts
Available test commands:
- `npm test`: Run tests once
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage
- `npm run test:ui`: Run tests with Vitest UI

## Build Configuration

### Production Build
The build process includes:
- TypeScript compilation
- React component bundling
- Asset optimization
- Code splitting for vendor libraries

### Build Validation
The CI pipeline validates:
- `dist/index.html` exists
- `dist/assets/` directory exists
- Build size and structure

## Security Configuration

### npm audit
The pipeline runs `npm audit` with moderate level checking:
- Checks for known vulnerabilities
- Reports security issues
- Can be configured to fail on high-severity issues

## Deployment Integration

### Netlify
The project includes Netlify configuration:
- `netlify.toml` for build settings
- Deploy script: `npm run deploy`
- Automatic deployment can be triggered post-CI

### Firebase (if using)
For Firebase integration:
- Ensure Firebase credentials are in GitHub secrets
- Configure Firebase CLI in the workflow if needed

## Monitoring and Alerts

### GitHub Issues
Automatic issue creation for:
- Main branch test failures
- Security vulnerabilities
- Build failures

### Notifications
Configure GitHub notifications for:
- Workflow failures
- Security alerts
- Dependency updates

## Performance Optimization

### Cache Strategy
The pipeline uses npm cache to speed up builds:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    cache: 'npm'
```

### Parallel Execution
Tests run in parallel across Node.js versions (18.x, 20.x)

### Artifact Management
- Test results are uploaded as artifacts
- Coverage reports are preserved
- Build outputs are cached

## Maintenance

### Regular Updates
- Update Node.js versions in the matrix
- Keep GitHub Actions versions current
- Review and update security audit levels

### Cleanup
- Old workflow runs are automatically cleaned up
- Artifacts have retention policies
- Issues are automatically labeled for triage
