from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.routers import fraud, returns, marketplace, search

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShieldMart API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fraud.router)
app.include_router(returns.router)
app.include_router(marketplace.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {
        "app": "ShieldMart",
        "version": "2.0.0",
        "tagline": "AI-verified used goods marketplace",
        "status": "running"
    }