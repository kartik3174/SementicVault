# SemanticVault – Enterprise local RAG Document Intelligence System

Welcome to **SemanticVault**, an enterprise-grade, high-security, local-first Retrieval-Augmented Generation (RAG) system. Engineered for high performance, SemanticVault processes documents (PDFs, DOCX, TXT, Markdown), generates layout-aware chunks with parametric sliding overlaps, encodes text into dense vectors, and leverages advanced semantic retrieval to serve accurate responses powered by local LLMs (Ollama/Llama 3.2) or Gemini API, complete with inline grounded source citations and page numbers.

All operations—text extraction, tokenization, vector searches, and LLM inference—are isolated within secure server boundaries. Zero third-party cloud data leaks, maximum performance, and cryptographic security.

---

## 🏗️ SYSTEM ARCHITECTURE & DIAGRAMS

### 1. Conceptual Architecture & System Design
```
                       +----------------------------------+
                       |        React 19 Frontend         |
                       |   (Vite, Tailwind, Lucide Icons)  |
                       +----------------┬-----------------+
                                        │
                                        │ (HTTPS / SSE Stream)
                                        ▼
                       +----------------------------------+
                       |       Node.js Express API        | (Gateway, Auth, Telemetry, History,
                       |        & RAG Orchestrator        |  Prompt Injection Guardrails)
                       +--------┬────────────────┬--------+
                                │                │
             (Embed / Query)    │                │ (Read / Write Metadata)
                                ▼                ▼
         +------------------------------+  +------------------------------+
         |     Python ML Microservice   |  |   Durable Local Database     |
         |    (FastAPI Ingest / ML)     |  |       (data/db.json)         |
         +--------------┬---------------+  +------------------------------+
                        │
                        ├──────────────────────────────┐
                        ▼                              ▼
         +------------------------------+  +------------------------------+
         |      Local Vector Store      |  |      Inference Core          |
         |      (ChromaDB Engine)       |  |  (Ollama Llama / Gemini API) |
         +------------------------------+  +------------------------------+
```

### 2. End-to-End Execution Sequence Diagram
```
User             React Frontend           Node.js Gateway       ChromaDB Engine       Ollama LLM Core
│                     │                         │                       │                     │
├─► Ask Query ────────┼────────────────────────►│                       │                     │
│   "Explain Q3 Rev"  │ (Send JWT auth)         │                       │                     │
│                     │                         ├─► Run Safety Check ───┼────────────────────►│ (Prompt Injection Guard)
│                     │                         │   (Passes)            │                     │
│                     │                         │                       │                     │
│                     │                         ├─► Embed & Query ─────►│                     │
│                     │                         │   Cosine Similarity   │                     │
│                     │                         │◄─ Return Top K Chunks─┤                     │
│                     │                         │   with Source Metadata│                     │
│                     │                         │                       │                     │
│                     │                         ├─► Build Prompt ───────┼────────────────────►│ (Inject Context & Sources)
│                     │                         │   Instruction         │                     │
│                     │                         │                       │                     │
│                     │                         ├─► Stream Stream SSE ──┼────────────────────►│ (Inference / Token Stream)
│                     │◄────────────────────────┼───────────────────────┼─────────────────────┤
│                     │                         │                       │                     │
│◄── Display Tokens ──┤                         │                       │                     │
│   With Source Citations                       │                       │                     │
```

### 3. Folder Structure Architecture
```
/
├── backend/                  # Python machine learning microservice
│   ├── app/
│   │   ├── api/              # FastAPI routers
│   │   ├── config/           # Pydantic configuration settings
│   │   ├── rag/              # Ingestion & retrieval logic
│   │   ├── services/         # Vector embeddings & database orchestrations
│   │   └── main.py           # FastAPI server entrypoint
│   ├── Dockerfile            # Container definition for ML service
│   └── requirements.txt      # Python package dependencies
├── data/                     # Physical database storage
│   └── db.json               # Local database engine
├── logs/                     # Rotation systems log
│   └── system.log            # Physical logs output
├── src/                      # React 19 Frontend Web Application
│   ├── components/           # Modular visual views (Chat, Documents, Analytics, Settings)
│   ├── types.ts              # Global TypeScript strict type mappings
│   ├── App.tsx               # Primary interface orchestrator & React Router
│   └── main.tsx              # React mounting root
├── tests/                    # Core Testing Infrastructure
│   └── api.test.ts           # Automatic multi-suite integration tests
├── scripts/                  # Performance Evaluation Suite
│   └── eval_rag.js           # RAG Pipeline Precision, Recall, and Latency Evaluation
├── server.ts                 # Full-Stack Node.js express production API gateway
├── server_helpers.ts         # PBKDF2 hashing, stateful rate-limiting, and stateless JWT engine
├── package.json              # Client dependencies and execution tasks
└── docker-compose.yml        # Development & production infrastructure compose configuration
```

### 4. RAG Ingestion and Query Pipeline
```
INGESTION PHASE:
[Documents] ──► [Extraction (PyMuPDF)] ──► [Recursive Sliding Chunker] ──► [Embed (MiniLM)] ──► [ChromaDB Index]

QUERY RETRIEVAL PHASE:
[User Query] ──► [Compute Embed] ──► [Similarity Search (Chroma)] ──► [Retrieve Chunks] ──► [Prompt Builder] ──► [Ollama/Gemini]
```

### 5. Multi-Service Containerized Deployment
```
                       +--------------------------------------+
                       |          Host Port: 3000             |
                       +──────────────────┬───────────────────+
                                          │
                                          ▼
                       +--------------------------------------+
                       |       Nginx Reverse Proxy            |
                       +──────────────────┬───────────────────+
                                          │
                                          ▼
                       +--------------------------------------+
                       |      Node.js Gateway Container       |
                       +──────┬────────────────────────┬──────+
                              │                        │
                              ▼                        ▼
               +────────────────────────+    +────────────────────────+
               | Python ML Container    |    | Local Database Volume  |
               | (Port 8000 / FastAPI)  |    |     (/data/db.json)    |
               +────────────────────────+    +────────────────────────+
```

---

## 💻 TECH STACK EXPLAINED

| Component | Technology | Role | Why We Selected It |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19 + TypeScript + Tailwind CSS | Interactive Developer Dashboard | High speed, robust type safety, fluid layouts, and gorgeous modular rendering. |
| **API Backend Gateway** | Node.js + Express + TSX | Main Full-Stack Server on Port 3000 | Lightweight, handles fast server-sent events (SSE) streaming, telemetry dashboards, and security. |
| **ML Microservice** | Python 3.12 + FastAPI | RAG Vector Orchestration Layer | High performance for machine learning libraries, native type validations (Pydantic), and direct GPU support. |
| **Embedding Engine**| SentenceTransformers | Semantic Vector Translation | Utilizes the `all-MiniLM-L6-v2` model locally to encode chunks into 384-dimensional dense vectors. |
| **Vector Database** | ChromaDB | High-Dimensional Vector Search | Embeddable, lightweight, open-source vector store designed specifically for RAG and LLM applications. |
| **Local LLM Server**| Ollama | Local Inference Model Server | Runs high-performance open-source LLMs (llama3.2 3B) on local hardware with OpenAI-compatible interfaces. |

---

## 🛡️ CRYPTOGRAPHIC SECURITY & HEURISTICS

SemanticVault is hardened to enterprise-grade compliance standards:
- **Stateless HMAC-SHA256 JWT sessions**: Authenticates users securely without high-latency state fetches.
- **Robust PBKDF2 Password Hashing**: Avoids rainbow-table lookups using high-entropy salt strings and 1000 iteration cycles.
- **Parametric Rate-Limiting**: Controls client concurrency, shielding endpoints from DoS/Brute-Force attacks.
- **Heuristic Threat Scanners**: Standard inputs are run against system-instruction override matching heuristics, instantly blocking Prompt Injection.

---

## 🛠️ INSTALLATION & DEVELOPMENT PLAYBOOK

### 1. Configure Environmental Settings
Create a `.env` file at the root directory based on `.env.example`:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
JWT_SECRET="your-high-entropy-jwt-secret-string-here"
```

### 2. Launch Local Dev Mode
Install dependencies and run the Node.js Express server:
```bash
npm install
npm run dev
```
The unified server starts instantly on http://localhost:3000, serving the compiled React frontend, full-stack endpoints, telemetry dashboards, and user sessions.

### 3. Run Ingest and Vector Engine (Optional)
If running Python modules locally:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app/main.py
```

### 4. Production Orchestration with Docker Compose
Orchestrate all containers automatically:
```bash
docker-compose up --build
```

---

## 🧪 TESTING & AUTOMATED QUALITY ASSURANCE

We maintain a rigorous quality assurance loop across development stages.

### 1. Run Unit & Integration Tests
We verify token verification, cryptographic PBKDF2 hashing, security injection scanners, sliding overlap chunking, and similarity ranking directly in an automated test suite:
```bash
# Run tests directly in Node environment
npx tsx tests/api.test.ts
```

### 2. Run RAG Performance & Precision Evaluation Script
We assess Mean Precision @ K, Mean Recall @ K, Mean Reciprocal Rank (MRR), response latency percentiles, and hallucination metrics:
```bash
# Execute evaluation benchmarks
node scripts/eval_rag.js
```

---

## 📄 LICENSE
This project is licensed under the [MIT License](LICENSE). Contributions must adhere to the [Contributing Guidelines](CONTRIBUTING.md).
