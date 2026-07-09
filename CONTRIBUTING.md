# Contributing to SemanticVault

Thank you for your interest in contributing to **SemanticVault**! We welcome contributions of all types: bug fixes, performance optimizations, documentation improvements, features, and feedback.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### 1. Reporting Bugs
- Search existing issues to ensure the bug hasn't been reported.
- Open a new issue with a clear title, a detailed description, steps to reproduce, and environment details (Node.js version, browser, OS).

### 2. Suggesting Enhancements
- Open an issue explaining the proposed feature and why it would be valuable.
- Participate in discussion threads to help refine the implementation plan.

### 3. Pull Requests
1. **Fork the Repository**: Create a personal fork of the project.
2. **Create a Feature Branch**: Branch out from `main` (e.g., `git checkout -b feature/hybrid-search`).
3. **Write Clean Code**: Ensure your changes follow our coding standards (formatting, typing, linting).
4. **Write Tests**: Include corresponding unit or integration tests for new modules.
5. **Verify Quality**: Run the linter and compiler before committing.
   ```bash
   npm run lint
   npm run build
   ```
6. **Submit PR**: Open a pull request targeting the `main` branch. Provide a descriptive summary of your adjustments.

## Coding Standards

### TypeScript & React
- Use functional components and modern React 19 hooks.
- Maintain absolute type-safety. Avoid using the `any` type; declare explicit interfaces in `/src/types.ts`.
- Prefer Tailwind utility classes for all styling. Do not introduce custom CSS files.

### Node.js Backend
- Follow the repository pattern for database interactions.
- Log critical actions using the unified `StructuredLogger`.
- Keep environment secrets isolated and secure.

## Git Commit Guidelines
We recommend using the standard semantic commit message convention:
- `feat:` for new features (e.g., `feat: integrate cross-encoder re-ranking`)
- `fix:` for bug fixes (e.g., `fix: resolve sse stream buffer cutoff`)
- `docs:` for documentation modifications (e.g., `docs: update deployment instructions`)
- `refactor:` for code restructurings that do not change functionality
- `test:` for adding or updating tests

Thank you for helping us build the future of secure, local-first retrieval augmented generation!
