import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from core.config import LOG_LEVEL
from services.sandbox import check_bwrap
from services.session_manager import SubprocessRegistry

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

registry: SubprocessRegistry | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global registry

    if not check_bwrap():
        logger.error("bwrap is not available. Install with: sudo apt install bubblewrap")
        raise RuntimeError("bwrap is not installed")

    logger.info("Starting SubprocessRegistry...")
    registry = SubprocessRegistry()
    yield
    logger.info("Shutting down SubprocessRegistry...")
    await registry.shutdown()


app = FastAPI(title="codenano-agent-service", lifespan=lifespan)

from api.routes import sessions  # noqa: E402, F401
from api.routes import files  # noqa: E402, F401

app.include_router(sessions.router)
app.include_router(files.router)
