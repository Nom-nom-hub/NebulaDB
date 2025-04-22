# Contributing to NebulaDB

Thank you for considering contributing to NebulaDB! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list to see if the problem has already been reported. When you are creating a bug report, please include as many details as possible:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (browser, Node.js version, etc.)
- Screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Any relevant examples or mockups
- Why this enhancement would be useful to most users

### Pull Requests

- Fill in the required template
- Follow the coding style of the project
- Include appropriate tests
- Update documentation as needed
- End all files with a newline

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build the packages: `npm run build`
4. Run tests: `npm test`

## Project Structure

```
nebula-db/
├── packages/
│   ├── core/              # Core database functionality
│   ├── adapters/          # Storage adapters
│   │   ├── memory/
│   │   ├── localstorage/
│   │   ├── indexeddb/
│   │   └── filesystem/
│   └── plugins/           # Optional plugins
│       ├── encryption/
│       ├── validation/
│       └── versioning/
├── examples/              # Example applications
├── tests/                 # Test suite
├── docs/                  # Documentation
└── benchmarks/            # Performance benchmarks
```

## Coding Guidelines

- Use TypeScript for all code
- Follow the existing code style
- Write descriptive commit messages
- Add tests for new features
- Update documentation for API changes

## Testing

- Run `npm test` to execute the test suite
- Ensure all tests pass before submitting a pull request
- Add new tests for new features or bug fixes

## Documentation

- Update documentation for any changes to the API
- Use clear and concise language
- Include examples where appropriate

## Submitting Changes

1. Push your changes to your fork
2. Submit a pull request to the main repository
3. The pull request will be reviewed by maintainers
4. Address any feedback from the review
5. Once approved, your changes will be merged

## Release Process

1. Update version numbers in package.json files
2. Update CHANGELOG.md
3. Create a new release on GitHub
4. Publish packages to npm

Thank you for contributing to NebulaDB!
