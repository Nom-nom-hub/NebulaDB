# Change Log

All notable changes to the "nebuladb-vscode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4] - 2024-07-21

### Fixed
- Fixed type error in configuration template by using proper adapter instantiation
- Updated configuration to use `new MemoryAdapter()` instead of string value

## [0.0.3] - 2024-07-21

### Fixed
- Fixed import path in the project initialization template to include the `.ts` extension

## [0.0.2] - 2024-07-21

### Fixed
- Updated VS Code engine compatibility to support version 1.74.0 and above
- Fixed compatibility issues with VS Code 1.97.1
- Simplified activation events

## [0.0.1] - 2024-07-20

### Added
- Initial release
- Code snippets for common NebulaDB operations
- Commands for creating configuration files and initializing projects
- Documentation links