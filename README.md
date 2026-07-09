# SemanticVault – Local LLM-Powered Semantic Retrieval System (RAG)

Welcome to **SemanticVault**, an enterprise-grade, fully local Retrieval-Augmented Generation (RAG) system. This project is engineered to process document files (PDFs, DOCX, TXT, Markdown), chunk and embed their text, store them in a vector database, and query a local Large Language Model (LLM) for precise answers with direct source citations and page numbers.

All computation—text extraction, embedding generation, vector search, and language model inference—runs **completely locally** on your machine. No cloud API calls, no leak of private information, and no third-party data tracking.

---

## 🏗️ SYSTEM ARCHITECTURE & DATA FLOW

The following diagram illustrates how raw documents undergo state-of-the-art vector processing, leading to real-time local synthesis:

```
                                  [ + ADD DOCUMENT ]
                                          │ (PDF, DOCX, TXT, MD)
                                          ▼
                               ┌──────────────────────┐
                               │   Document Loader    │ (PyMuPDF, python-docx)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │    Text Cleaner      │ (Normalize whitespaces, strip formatting)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │   Recursive Chunker  │ (Token/Char limit with sliding overlap)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │  Embeddings Engine   │ (SentenceTransformers: all-MiniLM-L6-v2)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │   Chroma Vector DB   │ (Index chunks by high-dimensional vectors)
                               └──────────────────────┘

───────────────────────────────────────────────────────────────────────────────────────────

                                   [ USER QUERY ]
                                          │ e.g. "What is our company policy on remote work?"
                                          ▼
                               ┌──────────────────────┐
                               │  Embeddings Engine   │ (Compute Query Vector)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │  Similarity Matcher  │ (ChromaDB Cosine Similarity Query)
                               └──────────┬───────────┘
                                          │
                                          ▼  [ Top K Chunks (with Page & Doc Metadata) ]
                               ┌──────────┴───────────┐
                               │    Prompt Builder    │ (Inject context into systemic instructions)
                               └──────────┬───────────┘
                                          │
                                          ▼  [ Hydrated System + Context Prompt ]
                               ┌──────────┴───────────┐
                               │      Local LLM       │ (Ollama: llama3.2 3B model)
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │  Synthesized Answer  │ (Verbatim citations & page numbers)
                               └──────────────────────┘
```

---

## 💻 TECH STACK EXPLAINED

| Component | Technology | Role | Why We Selected It |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19 + TypeScript + Tailwind CSS | Interactive Developer Dashboard | High speed, robust type safety, fluid layouts, and gorgeous modular rendering. |
| **API Backend** | Python 3.12 + FastAPI | RAG Orchestration Layer | Fast asynchronous operations, native typing (Pydantic), and seamless integration with ML libraries. |
| **Parsing Engine**| PyMuPDF + python-docx | Text Extraction | Native speed parsing for complex PDFs and structural metadata parsing for Office documents. |
| **Embedding Engine**| SentenceTransformers | Semantic Vector Translation | Utilizes the `all-MiniLM-L6-v2` model locally to encode chunks into 384-dimensional dense vectors. |
| **Vector Database** | ChromaDB | High-Dimensional Vector Search | Embeddable, lightweight, open-source vector store designed specifically for RAG and LLM applications. |
| **Local LLM Server**| Ollama | Engine for Local Inference | Runs high-performance open-source LLMs (llama3.2) on CPU/GPU with an OpenAI-compatible server API. |
| **Containerization**| Docker & Docker Compose | Multi-container Deployment | Ensures reproducible environments across development, testing, and local operations. |

---

## 🛠️ LOCAL CONFIGURATION & SETUP GUIDE (PHASE 1)

Follow these exact steps to prepare your local machine for SemanticVault.

### 1. Prerequisites
Ensure you have the following installed on your host operating system:
* [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) (v20.10 or higher)
* [Python](https://www.python.org/downloads/) (v3.12 or higher)
* [Ollama](https://ollama.com/) (For local LLM hosting)

---

### 2. Setting Up Ollama & Llama 3.2 Locally

Ollama serves as your local model runner.

#### Step 2.1: Download and Install Ollama
* **macOS / Linux**: Open your terminal and run:
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```
* **Windows**: Download the standalone installer from [Ollama's website](https://ollama.com/download/windows).

#### Step 2.2: Launch the Ollama Service
Once installed, make sure the Ollama daemon is running:
* **macOS**: Runs automatically in the menu bar.
* **Linux**: Confirm with systemd: `sudo systemctl start ollama`
* **Windows**: Run the desktop icon.

#### Step 2.3: Pull the Models
Pull the required LLM and Embedding models to your local machine:
```bash
# Pull the 3B parameter Llama 3.2 model (Highly optimized for local consumer CPUs)
ollama pull llama3.2

# Pull the high-performance semantic embedding model (Optional, if using Ollama for embeddings)
ollama pull nomic-embed-text
```

#### Step 2.4: Verify Ollama is Alive
Verify the Ollama API server is active (it binds to port `11434` by default):
```bash
curl http://localhost:11434
# Expecting response: "Ollama is running"
```

To list all pulled local models:
```bash
ollama list
```

---

### 3. Backend Local Environment Preparation

Set up a local Python virtual environment to verify the dependencies.

#### Step 3.1: Navigate to the Backend folder
```bash
cd backend
```

#### Step 3.2: Create and Activate virtual environment
* **macOS/Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```
* **Windows (PowerShell)**:
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```

#### Step 3.3: Install Python Packages
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 4. Running the Complete App with Docker Compose

Rather than launching each service manually, use Docker Compose to spawn the multi-service architecture:

```bash
# From the root directory containing docker-compose.yml:
docker-compose up --build
```

This will automatically configure:
1. **Ollama Container** on `localhost:11434`
2. **FastAPI Python Backend** on `localhost:8000`
3. **Frontend Application Dashboard** on `localhost:3000`

---

## 🧑‍🎓 CONCEPT REFRESHER

### What is RAG (Retrieval-Augmented Generation)?
Large Language Models (LLMs) are frozen in time; they are limited to the knowledge present in their training dataset up to their training cutoff date. If you ask an LLM about your company's latest internal documents, it will hallucinate (make up an answer) or state that it doesn't know.

RAG solves this by converting the LLM's task from **generation from memory** to **open-book synthesis**. Before querying the LLM, we retrieve relevant context from an external vector index, append it to our prompt instruction, and ask the LLM to write a factual response based *only* on that context.

### Why RAG instead of Fine-Tuning?
1. **Cost & Computation**: Fine-tuning requires massive computational resources (GPUs) and training expertise. RAG is extremely fast and inexpensive.
2. **Real-time Updates**: To update knowledge in a fine-tuned model, you must retrain or fine-tune again. With RAG, you simply add or update documents in the Vector Database; changes are reflected immediately.
3. **No Hallucinations (Factuality)**: Fine-tuned models can still hallucinate facts. RAG is constrained strictly by the provided context and can point to page citations for auditability.
4. **Access Control**: In RAG, you can filter documents before retrieval to match the user's security permissions, which is impossible in fine-tuned models.

---

## 📌 WHAT'S NEXT: PHASE 2 PLANNING
In Phase 2, we will design and implement the **Document Loader & Cleaning Pipeline**:
* Create Python loaders for TXT, Markdown, DOCX, and PDFs.
* Write custom text-cleaning normalization functions.
* Implement a robust **Recursive Character Chunker** with overlap variables.
* Build the API endpoint to view chunking outputs visually.
