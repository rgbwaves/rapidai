FROM python:3.13-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY rapid_ai_engine/requirements.txt ./rapid_ai_engine/
RUN pip install --no-cache-dir -r rapid_ai_engine/requirements.txt

# Copy only the engine package
COPY rapid_ai_engine/ ./rapid_ai_engine/

EXPOSE 8000

CMD ["uvicorn", "rapid_ai_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
