# SemanticVault 🧠📚

> **Private AI. Smarter Search. Local Intelligence.**

SemanticVault is a **production-ready Local LLM-Powered Retrieval-Augmented Generation (RAG) platform** that enables users to upload documents and interact with them using natural language. Unlike cloud-based AI services, SemanticVault runs **entirely on your local machine** using **Ollama**, ensuring complete data privacy while delivering fast, context-aware responses.

---

## ✨ Features

### 📄 Document Management

* Upload PDF, DOCX, TXT, and Markdown files
* Multiple document support
* Drag-and-drop upload
* Document metadata extraction
* Automatic document indexing
* Delete and re-index documents

### ✂️ Intelligent Processing

* Text extraction
* Intelligent text cleaning
* Recursive chunking
* Metadata generation
* Chunk validation
* Token estimation

### 🧠 AI & RAG

* Local LLM using Ollama
* Retrieval-Augmented Generation (RAG)
* Semantic Search
* Context-aware responses
* Source citations
* Page number references
* Streaming AI responses
* Hallucination reduction through grounded context

### 🗄️ Vector Search

* ChromaDB integration
* Persistent vector storage
* Semantic similarity search
* Metadata filtering
* Top-K retrieval
* Fast document retrieval

### 💬 Chat Experience

* Chat history
* Markdown rendering
* Code syntax highlighting
* Streaming responses
* Copy response
* Regenerate answer
* Auto scroll

### 🎨 Frontend

* Next.js 15
* Responsive UI
* Tailwind CSS
* Dark Mode
* Light Mode
* Modern dashboard
* Analytics panel

### 🔐 Security

* JWT Authentication
* Password hashing
* Role-based access control (RBAC)
* Protected APIs
* Secure file uploads
* Input validation
* Rate limiting
* CORS protection

### 📊 Analytics

* Document statistics
* Chunk analytics
* Embedding analytics
* Retrieval analytics
* Response latency
* Token usage

### 🐳 DevOps

* Docker support
* Docker Compose
* Nginx Reverse Proxy
* Health checks
* Production configuration
* Structured logging

---

# 🚀 System Architecture

```text
                     User

                       │

                       ▼

              Next.js Frontend

                       │

              REST API / Streaming

                       │

                       ▼

              FastAPI Backend

                       │

      ┌────────────────┼─────────────────┐

      │                │                 │

      ▼                ▼                 ▼

Document Loader   Authentication     Chat API

      │

      ▼

Text Extraction

      │

      ▼

Text Cleaning

      │

      ▼

Recursive Chunking

      │

      ▼

Sentence Embeddings

      │

      ▼

ChromaDB Vector Store

      │

      ▼

Semantic Retrieval

      │

      ▼

Prompt Builder

      │

      ▼

Local LLM (Ollama)

      │

      ▼

Generated Response

      │

      ▼

Streaming Answer + Citations
```

---

# 🧩 RAG Workflow

```text
Upload Document

      │

      ▼

Extract Text

      │

      ▼

Clean Text

      │

      ▼

Generate Chunks

      │

      ▼

Generate Embeddings

      │

      ▼

Store in ChromaDB

      │

      ▼

User asks a question

      │

      ▼

Convert question into embedding

      │

      ▼

Retrieve Top-K Chunks

      │

      ▼

Build Prompt

      │

      ▼

Send to Ollama

      │

      ▼

Generate Answer

      │

      ▼

Display Answer + Sources
```

---

# 🛠 Technology Stack

## Frontend

* Next.js 15
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Zustand
* TanStack Query

## Backend

* Python 3.12
* FastAPI
* LangChain
* SentenceTransformers
* ChromaDB
* Pydantic
* Uvicorn

## AI

* Ollama
* llama3.2
* all-MiniLM-L6-v2

## Database

* ChromaDB
* SQLite (Development)
* PostgreSQL (Production)

## DevOps

* Docker
* Docker Compose
* Nginx

## Testing

* Pytest
* FastAPI TestClient
* Playwright

---

# 📁 Project Structure

```text
SemanticVault/

├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── chunking/
│   │   ├── config/
│   │   ├── core/
│   │   ├── embeddings/
│   │   ├── loaders/
│   │   ├── models/
│   │   ├── ollama/
│   │   ├── prompts/
│   │   ├── rag/
│   │   ├── retrieval/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── vectorstore/
│   │   └── main.py
│   │
│   ├── uploads/
│   ├── chroma_db/
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── public/
│   ├── styles/
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── nginx/
├── LICENSE
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/your-username/SemanticVault.git

cd SemanticVault
```

---

## Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate
```

Windows

```bash
venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

## Frontend

```bash
cd frontend

npm install
```

---

## Install Ollama

Install Ollama from the official website.

Download the required model:

```bash
ollama pull llama3.2
```

Verify installation:

```bash
ollama run llama3.2
```

---

## Run Backend

```bash
uvicorn app.main:app --reload
```

---

## Run Frontend

```bash
npm run dev
```

---

# 🐳 Docker

Build and start the application:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

---

# 🔑 Environment Variables

Example `.env`

```env
APP_NAME=SemanticVault
APP_VERSION=1.0.0

HOST=127.0.0.1
PORT=8000

OLLAMA_BASE_URL=http://localhost:11434

EMBEDDING_MODEL=all-MiniLM-L6-v2

VECTOR_DB_PATH=./chroma_db

JWT_SECRET_KEY=change_this_secret

ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

# 📡 API Endpoints

| Method | Endpoint            | Description                  |
| ------ | ------------------- | ---------------------------- |
| POST   | /upload             | Upload document              |
| GET    | /documents          | List uploaded documents      |
| DELETE | /documents/{id}     | Delete document              |
| POST   | /chunk/{id}         | Generate chunks              |
| POST   | /embeddings/{id}    | Generate embeddings          |
| POST   | /vectors/index/{id} | Index vectors                |
| POST   | /retrieve           | Retrieve relevant chunks     |
| POST   | /chat               | Chat with uploaded documents |
| GET    | /history            | Conversation history         |
| DELETE | /history            | Clear history                |
| POST   | /register           | Register                     |
| POST   | /login              | Login                        |
| GET    | /profile            | User profile                 |

Interactive API documentation:

```
http://localhost:8000/docs
```

---

# 📊 Performance

* Fast semantic retrieval
* Streaming responses
* Persistent vector storage
* Background indexing
* Batch embedding generation
* Lazy loading
* Context caching
* Optimized chunk retrieval

---

# 🔒 Security

* JWT Authentication
* Password hashing
* Secure file validation
* Prompt injection mitigation
* Role-based access
* Protected APIs
* Rate limiting
* Structured logging

---

# 🧪 Testing

Backend

```bash
pytest
```

Frontend

```bash
npm run test
```

Coverage

```bash
pytest --cov=app
```

---

# 🚀 Future Improvements

* Hybrid Search (BM25 + Vector Search)
* Cross Encoder Re-ranking
* OCR Support
* Image Search
* Audio Document Support
* Video Transcript Search
* Multimodal RAG
* Redis Cache
* Knowledge Graph Integration
* Agentic RAG
* LangGraph Workflows
* Kubernetes Deployment
* Prometheus Monitoring
* Grafana Dashboards

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Why SemanticVault?

SemanticVault demonstrates practical experience in:

* Retrieval-Augmented Generation (RAG)
* Local LLM Integration
* Semantic Search
* Vector Databases
* Prompt Engineering
* AI Application Development
* FastAPI
* Next.js
* Docker
* Authentication
* Full-Stack Development
* Production Software Architecture

It is designed as a portfolio-quality project that showcases modern AI engineering practices while maintaining complete user privacy through local inference.

---

## 📌 Version

**Current Version:** `v1.0.0`

---

**If you found this project useful, consider giving it a ⭐ on GitHub!**
