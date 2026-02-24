RAPID AI Engine — Setup & Run
=============================

1. Install dependencies:
   pip install fastapi uvicorn[standard] pydantic numpy

2. From the "rapidai" folder, run:
   python -m uvicorn rapid_ai_engine.main:app --host 0.0.0.0 --port 8000

   OR simply:
   python rapid_ai_engine/run_server.py

3. Open in browser:
   http://localhost:8000/docs    (Swagger UI - interactive API docs)
   http://localhost:8000/health  (Health check)

4. Full pipeline endpoint:
   POST http://localhost:8000/rapid-ai/evaluate

Individual module endpoints:
   POST /rapid-ai/module0     (Data Guard)
   POST /rapid-ai/moduleA     (Trend Engine)
   POST /rapid-ai/moduleB     (Initiator Rules)
   POST /rapid-ai/moduleBplus (Slope Intelligence)
   POST /rapid-ai/moduleBpp   (SEDL Entropy)
   POST /rapid-ai/moduleC     (Fusion / SSI)
   POST /rapid-ai/moduleD     (Health Stage)
   POST /rapid-ai/moduleE     (Maintenance Plan)
   POST /rapid-ai/moduleF     (RUL & Governance)
