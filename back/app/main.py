from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="Game API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: ルーターを追加していく
# from app.routers import auth
# app.include_router(auth.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
