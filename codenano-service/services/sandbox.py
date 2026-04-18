import shutil
from pathlib import Path


def get_bwrap_path() -> str:
    path = shutil.which("bwrap")
    if not path:
        raise RuntimeError("bwrap is not installed. Install it with: sudo apt install bubblewrap")
    return path


def build_bwrap_args(session_id: str, cli_path: str, workspace_path: str) -> list[str]:
    workspace_path = str(Path(workspace_path).resolve())
    Path(workspace_path).mkdir(parents=True, exist_ok=True)

    bwrap_path = get_bwrap_path()

    return [
        bwrap_path,
        "--unshare-user",
        "--unshare-pid",
        "--unshare-uts",
        "--ro-bind", "/", "/",
        "--bind", workspace_path, "/workspace",
        "--tmpfs", "/tmp",
        "--tmpfs", "/var/tmp",
        "--dev", "/dev",
        "--proc", "/proc",
        "--hostname", f"sandbox-{session_id[:8]}",
        "--chdir", "/workspace",
        "node",
        cli_path,
    ]


def check_bwrap() -> bool:
    try:
        get_bwrap_path()
        return True
    except RuntimeError:
        return False
