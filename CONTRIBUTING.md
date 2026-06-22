# Contributing to BookmarX

Thank you for your interest in contributing to BookmarX! We welcome contributions of all kinds — bug fixes, features, documentation, and ideas.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Bug Reports & Feature Requests](#bug-reports--feature-requests)

## Code of Conduct

This project is committed to providing a welcoming, inclusive environment for everyone. By participating, you agree to:

- Be respectful and constructive in all interactions
- Accept feedback gracefully and offer feedback kindly
- Focus on what is best for the community and project
- Show empathy towards other community members

Harassment, hate speech, and discriminatory behavior are not tolerated.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/BookmarX.git`
3. Follow the [Development Setup](#development-setup) guide
4. Create a branch: `git checkout -b feat/my-feature`
5. Make your changes and commit them (see [Commit Convention](#commit-convention))
6. Push and open a Pull Request

## Development Setup

**Prerequisites:**

- [Bun](https://bun.sh) (v1.3+)
- [Docker](https://docker.com) + [Docker Compose](https://docs.docker.com/compose/)

**Steps:**

```bash
# Clone and enter
git clone https://github.com/your-username/BookmarX.git
cd BookmarX

# Copy environment
cp .env.example .env

# Install all dependencies (Bun workspaces)
bun install

# Start infrastructure
docker compose up postgres redis -d

# Run database migrations
bun --cwd backend run db:migrate

# Start backend (http://localhost:4000)
bun run dev:backend

# In another terminal, start the worker
bun --cwd backend run worker

# Start frontend (http://localhost:3000)
bun run dev:frontend
```

**Configuration:**

Edit `.env` with your credentials:

| Variable | Description |
|---|---|
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | X Developer App credentials |
| `AI_API_KEY` | OpenAI API key |
| `ENCRYPTION_KEY` | 32-byte base64 key for token encryption |

Generate an encryption key:

```bash
openssl rand -base64 32
```

## Project Structure

```
BookmarX/
├── backend/               # Hono API + BullMQ worker (Bun)
│   ├── src/
│   │   ├── ai/            # Embeddings, LLM calls, taxonomy
│   │   ├── auth/          # X OAuth 2.0, sessions, encryption
│   │   ├── briefs/        # AI-generated daily briefs
│   │   ├── config/        # Environment config (Zod)
│   │   ├── db/            # Drizzle schema, client, migrations
│   │   ├── http/          # Hono routes & middleware
│   │   ├── jobs/          # BullMQ job processors
│   │   ├── lib/           # Crypto utilities
│   │   ├── queues/        # BullMQ queue definitions
│   │   ├── settings/      # User settings service
│   │   └── x/             # X API client
│   ├── drizzle/           # SQL migration files
│   └── Dockerfile
├── frontend/              # Next.js app (React 19)
│   ├── app/               # App Router pages & API routes
│   ├── components/        # React components (shadcn/ui)
│   └── lib/               # API client, utilities
├── docs/                  # Documentation
├── docker-compose.yml     # Full stack deployment
└── package.json           # Root workspace config
```

## Coding Guidelines

### General

- **Language:** English only — code, comments, docs, commits, configs
- **Style:** Prefer self-documenting code over comments
- **No comments** unless the code cannot be made self-explanatory

### TypeScript / JavaScript

- Use `const` over `let` where possible
- Use explicit TypeScript types — avoid `any`
- Use `async/await` over raw promises
- Prefer functional patterns over mutation

### Backend (Hono)

- Routes are organized by resource in `backend/src/http/routes/`
- Business logic lives in services, not route handlers
- Use Zod for request validation
- Job processors live in `backend/src/jobs/`

### Frontend (Next.js)

- Server Components by default; colocate client logic in `"use client"`
- Use `shadcn/ui` components from `@/components/ui/`
- Tailwind CSS v4 for styling (no CSS modules unless necessary)
- Use server actions (`app/app/actions.ts`) for mutations

### Python

- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Type hints required for all public functions

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Rules:**
- Subject: 50 chars max, imperative mood ("add" not "added"), no period
- Body (optional): explain what and why at 72-char width
- Keep commits atomic — one logical change per commit
- Reference issues in the body when applicable

**Examples:**

```
feat(backend): add X OAuth 2.0 PKCE flow
fix(backend): handle token refresh race condition
docs: add self-hosting setup guide
refactor(frontend): extract bookmark card component
```

## Pull Request Process

1. **Title** follows the commit convention (e.g., `feat(backend): ...`)
2. **Description** explains what and why, with screenshots for UI changes
3. **Checklist:**
   - [ ] Code passes typecheck: `bun run typecheck`
   - [ ] Code passes lint: `bun run lint`
   - [ ] No `.env` secrets committed
   - [ ] Changes are covered by tests (where applicable)
4. **Small PRs are better** — keep changes focused
5. A maintainer will review; expect constructive feedback

## Bug Reports & Feature Requests

- **Issues:** Use [GitHub Issues](https://github.com/anomalyco/BookmarX/issues)
- **Bug reports:** Include steps to reproduce, expected vs actual behavior, and environment details
- **Feature requests:** Describe the problem you're solving, not just the solution you want

Thank you for helping make BookmarX better!
