from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGIN
from app.routers import admin, harness, intent_ws, scoring, sessions, writeback, ws

app = FastAPI(title="Vernacular Technical Screening API")

# Added on the very first commit per TRD §1 — bites in Hour 1 otherwise.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(scoring.router)
app.include_router(writeback.router)
app.include_router(harness.router)
app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(intent_ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}
