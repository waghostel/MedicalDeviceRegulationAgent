# Medical Device Regulatory Assistant - Documentation

## Overview

This directory contains comprehensive documentation for the Medical Device Regulatory Assistant project, with a focus on testing strategies, maintenance procedures, and development best practices.

## Documentation Structure

### 📋 Testing Documentation

#### Core Documents
- **[Testing Documentation Index](./testing-documentation-index.md)** - Central hub for all testing documentation
- **[Testing Strategy and Best Practices](./testing-strategy.md)** - Comprehensive testing approach and methodologies
- **[Testing Troubleshooting Guide](./testing-troubleshooting.md)** - Solutions to common testing issues
- **[Testing Maintenance Schedule](./testing-maintenance.md)** - Maintenance procedures and schedules

#### Quick Start Guides
- **New Developer Setup**: Start with [Testing Documentation Index](./testing-documentation-index.md)
- **Running Tests**: See package.json scripts or [Testing Strategy](./testing-strategy.md#running-tests)
- **Debugging Issues**: Check [Troubleshooting Guide](./testing-troubleshooting.md)
- **Maintenance Tasks**: Follow [Maintenance Schedule](./testing-maintenance.md)

### 🚀 Deployment Documentation

#### Existing Documents
- **[Setup Complete](./SETUP_COMPLETE.md)** - Project setup completion status
- **[Migration Guide](./migration-guide.md)** - Database and system migration procedures
- **[Task Report](./task-report.md)** - Development task completion reports
- **[Deployment](./deployment/)** - Deployment procedures and runbooks

### 🔧 Development Tools

#### Testing Maintenance Scripts
- **Daily Maintenance**: `pnpm maintenance:daily`
- **Weekly Maintenance**: `pnpm maintenance:weekly`
- **Monthly Maintenance**: `pnpm maintenance:monthly`
- **Specific Tasks**: See package.json for individual maintenance commands

#### CI/CD Pipelines
- **Main Pipeline**: `.github/workflows/ci.yml`
- **Comprehensive Testing**: `.github/workflows/comprehensive-testing.yml`
- **Visual Regression**: `.github/workflows/visual-regression.yml`
- **Security Testing**: `.github/workflows/security.yml`

## Testing Infrastructure Overview

### Test Types and Coverage

| Test Type | Framework | Coverage Target | Location |
|-----------|-----------|-----------------|----------|
| Unit Tests | Jest + RTL | 90% components, 95% hooks | `src/**/*.unit.test.{ts,tsx}` |
| Integration Tests | Jest + MSW | All critical workflows | `src/**/*.integration.test.{ts,tsx}` |
| E2E Tests | Playwright | All user journeys | `e2e/**/*.spec.ts` |
| Accessibility Tests | jest-axe | 100% interactive components | `src/**/*.accessibility.test.{ts,tsx}` |
| Performance Tests | Lighthouse CI | Core Web Vitals compliance | `src/**/*.performance.test.{ts,tsx}` |
| Visual Regression | Playwright | UI consistency | `e2e/visual/**/*.spec.ts` |

### Quality Gates

#### Code Quality
- ✅ TypeScript strict mode compliance
- ✅ ESLint and Prettier formatting
- ✅ 85% minimum test coverage
- ✅ Zero accessibility violations
- ✅ Performance budget compliance

#### CI/CD Requirements
- ✅ All tests pass
- ✅ Coverage thresholds met
- ✅ No security vulnerabilities
- ✅ Performance budgets maintained
- ✅ Visual regression tests pass

### Mock Data Strategy

#### Current Implementation
- **Mock Data Generators**: `src/lib/mock-data.ts`
- **API Mocking**: MSW handlers in `src/lib/testing/mock-handlers.ts`
- **Test Database**: SQLite in-memory for integration tests
- **Scenario-Based Testing**: Predefined test scenarios for different user workflows

#### Migration Path
1. **Phase 1**: Test all components with current mock data
2. **Phase 2**: Create test database with seeded mock data
3. **Phase 3**: Migrate to real API integration while maintaining test compatibility

## Quick Commands Reference

### Running Tests

```bash
# Unit tests
pnpm test:unit                    # All unit tests
pnpm test:unit --watch           # Watch mode
pnpm test:unit --coverage       # With coverage

# Integration tests
pnpm test:integration            # All integration tests
pnpm test:integration --watch   # Watch mode

# End-to-end tests
pnpm test:e2e                   # All E2E tests
pnpm test:e2e:ui                # Interactive mode
pnpm test:e2e:visual            # Visual regression

# Accessibility tests
pnpm test:accessibility         # Accessibility compliance

# Performance tests
pnpm test:performance           # Performance benchmarks
pnpm lighthouse                 # Lighthouse audit

# Complete test suite
pnpm test:all                   # All tests with coverage
```

### Maintenance Commands

```bash
# Daily maintenance
pnpm maintenance:daily          # Quick health checks

# Weekly maintenance
pnpm maintenance:weekly         # Comprehensive maintenance

# Monthly maintenance
pnpm maintenance:monthly        # Full audit and updates

# Specific maintenance tasks
pnpm maintenance:validate-mock  # Validate mock data
pnpm maintenance:coverage       # Analyze coverage
pnpm maintenance:performance    # Check performance
pnpm maintenance:cleanup        # Clean artifacts
pnpm maintenance:health         # Test suite health
```

### Debugging Commands

```bash
# Jest debugging
pnpm test --testNamePattern="ComponentName" --verbose
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debugging
pnpm exec playwright test --debug
pnpm exec playwright test --headed
pnpm exec playwright codegen localhost:3000

# Performance debugging
pnpm lighthouse:collect
pnpm bundlesize
```

## Development Workflow

### For New Features
1. **Write Tests First** (TDD approach)
2. **Use Mock Data** for initial development
3. **Ensure Coverage** meets quality gates
4. **Run Full Test Suite** before committing
5. **Update Documentation** if needed

### For Bug Fixes
1. **Reproduce Issue** with a failing test
2. **Fix Implementation** to make test pass
3. **Verify Fix** doesn't break existing tests
4. **Update Tests** if behavior changed
5. **Document Solution** in troubleshooting guide if needed

### For Maintenance
1. **Follow Schedule** in maintenance documentation
2. **Use Automated Scripts** when available
3. **Document Issues** and solutions
4. **Update Procedures** based on learnings

## Support and Resources

### Internal Resources
- **Testing Documentation**: This directory
- **Code Examples**: Test files throughout the codebase
- **CI/CD Logs**: GitHub Actions for pipeline details
- **Coverage Reports**: Generated after test runs

### External Resources
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Playwright Documentation**: https://playwright.dev/docs/intro
- **MSW Documentation**: https://mswjs.io/docs/
- **Lighthouse CI**: https://github.com/GoogleChrome/lighthouse-ci

### Getting Help
1. **Check Troubleshooting Guide** for common issues
2. **Review Test Examples** in the codebase
3. **Check CI/CD Logs** for detailed error information
4. **Consult External Documentation** for framework-specific issues
5. **Ask Team Members** for complex problems

## Contributing to Documentation

### When to Update Documentation
- Adding new testing patterns or utilities
- Discovering new troubleshooting solutions
- Changing testing infrastructure or tools
- Updating maintenance procedures
- Adding new quality gates or requirements

### How to Update Documentation
1. **Identify Relevant Document** to update
2. **Follow Existing Format** and style
3. **Include Code Examples** when helpful
4. **Update Cross-References** in other documents
5. **Test Instructions** to ensure accuracy

### Documentation Standards
- Use clear, concise language
- Include practical examples
- Maintain consistent formatting
- Update related documents
- Keep information current and accurate

This documentation serves as the foundation for maintaining high-quality, reliable testing practices throughout the Medical Device Regulatory Assistant project.