import logging

from fastapi import FastAPI

from app.api.routes import chat, conversations, health, messages, users
from app.core.config import settings

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(title=settings.app_name)

app.include_router(health.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
