# Contributing

## Branch Strategy

- `main` - Production/stable releases
- `dev` - Active development
- `feature/xxx` - Feature branches
- `fix/xxx` - Bug fixes
- `hotfix/xxx` - Production hotfixes
- `release/vX.X.X` - Release preparation

## Workflow

1. Create branch from `dev`: `git checkout -b feature/my-feature`
2. Make changes with conventional commits
3. Push and create PR to `dev`
4. After review, squash merge to `dev`
5. For releases: `release/vX.X.X` -> merge to `main` -> tag

## Commit Format

`
type(scope): message
`

**Types:** feat, fix, docs, chore, style, refactor, test, ci

**Examples:**
`
feat(auth): add login endpoint
fix(scan): handle timeout error
docs(readme): update setup instructions
chore(deps): update antd to 6.5
`

## Code Style

- TypeScript strict mode
- ESLint (Next.js config)
- 2 spaces indent
- Single quotes
- No semicolons (ESLint default)

## PR Guidelines

- Keep PRs focused and small
- Include related issue reference: `Ref #1`
- Describe what changed and why
- Ensure `pnpm build` and `pnpm lint` pass