import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the service root directory
load_dotenv(Path(__file__).parent.parent / ".env")


def _get_required(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise ValueError(f"Required environment variable not set: {key}")
    return val


ANTHROPIC_AUTH_TOKEN = _get_required("ANTHROPIC_AUTH_TOKEN")
ANTHROPIC_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
CODENANO_CLI_PATH = os.environ.get("CODENANO_CLI_PATH", "../codenano-cli/dist/index.js")
SB_TTL_MINUTES = int(os.environ.get("SB_TTL_MINUTES", "30"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
WORKSPACE_BASE_DIR = os.environ.get("WORKSPACE_BASE_DIR", "/tmp/host_sessions")
