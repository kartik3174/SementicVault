# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-09

### Added
- **Unified Full-Stack RAG Architecture**: Node.js Express server running with React 19 and Vite on a single shared workspace.
- **Durable JSON File Database Engine**: Local physical table simulation under `data/db.json` with multi-tenant workspace partitions.
- **Intelligent Chunking Engine**: Advanced layout-aware chunking separating pages and applying parametric sliding overlaps.
- **Dual Inference Core**: Connection status check supporting local **Ollama** models with secure failover to **Gemini API** on the server.
- **Cryptographic Security Layers**: Added robust password hashing (PBKDF2), stateless HMAC-SHA256 JWT tokens, and rate-limiting.
- **Heuristic Threat Scanners**: Prompt injection defense scanning inputs for system-instruction overrides.
- **Enterprise telemetry & controls**: Added a dashboard, vector search history audit logs, latency distribution graphics, database purging, and document favorite bookmarks.

### Changed
- Refactored `/server.ts` to implement standard API endpoints with token verification.
- Upgraded the chat UI to support server-sent events (SSE) for streaming completions and rich grounded inline citations.

### Fixed
- Fixed token extraction error during page refreshes.
- Fixed chat sidebar scroll and layout reflow.
