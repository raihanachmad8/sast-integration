# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-28

### Added

- Initialize Next.js 16 project with TypeScript and pnpm
- Configure Ant Design 6 with custom theme
- Create modular folder structure (features, modules, server, commons, lib)
- Add route group layouts (public, unauthenticated, authenticated)
- Add app-shell with Ant Design Layout + collapsible Sider
- Add server HTTP helpers (ApiResponse, AppError classes)
- Add Zod environment validation
- Add commons constants (app, routes, navigation) and types
- Add health check endpoint (GET /api/v1/health)
- Add base documentation (README, CONTRIBUTING, CHANGELOG)
- Install base dependencies (zod, jose, bcryptjs, date-fns)