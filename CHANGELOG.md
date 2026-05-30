# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-29

### Added

- Add remaining schemas: projects, source_controls, repositories, environments
- Add scan schemas: scan_policies, scans, scan_results, schedules, quality_gates, quality_gate_results
- Add finding schemas: finding_groups, findings, ai_verifications, comments, finding_history
- Add AI schemas: ai_models (with prompt_preset, model chain config)
- Add knowledge schemas: knowledge_sources, knowledge_entries (with tags, muted, usage count)
- Add integration schemas: webhooks, audit_logs, activity_logs
- Add report schemas: reports, storage_files
- Add permissions constants (src/commons/constants/permissions.ts)
- Add 24 granular permissions with ROLE and PERMISSION constants
- Add migration runner (drizzle/migrate.ts)
- Add seed script (drizzle/seed.ts) — admin user, workspace, permissions, role mappings
- Add DATABASE.md documentation
- Total: 41 tables in single migration

### Changed

- Update ai_verifications: expanded with verdict, data_flow, taint_source, match_detail, likely_cwe, fix_suggestion (research-informed)
- Update schedules: add policy_id, branch, timezone
- Update findings: add rule, scanner, message fields
- Update README with current tech stack and project status
- Update ROADMAP with M2 progress and expanded M6/M7

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