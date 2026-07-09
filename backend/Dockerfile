FROM python:3.12-slim

WORKDIR /app

# Install system dependencies needed for compiling certain packages or reading PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create folders for uploads and chroma database persistence
RUN mkdir -p /app/uploads /app/chroma_db

# Copy backend application source code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
