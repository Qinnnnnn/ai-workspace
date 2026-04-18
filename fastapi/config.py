import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _get_required(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise ValueError(f"Required environment variable not set: {key}")
    return val


ANTHROPIC_API_KEY = _get_required("ANTHROPIC_API_KEY")
CODENANO_CLI_PATH = os.environ.get("CODENANO_CLI_PATH", "../codenano-cli/dist/index.js")
SB_TTL_MINUTES = int(os.environ.get("SB_TTL_MINUTES", "30"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
WORKSPACE_BASE_DIR = os.environ.get("WORKSPACE_BASE_DIR", "/tmp/host_sessions")
