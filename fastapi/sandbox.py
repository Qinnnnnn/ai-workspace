import os
import shutil
import subprocess
from pathlib import Path


def get_bwrap_path() -> str:
    path = shutil.which("bwrap")
    if not path:
        raise RuntimeError("bwrap is not installed. Install it with: sudo apt install bubblewrap")
    return path


def build_bwrap_args(session_id: str, cli_path: str) -> list[str]:
    sandbox_dir = Path(f"/tmp/sandbox/{session_id}")
    sandbox_dir.mkdir(parents=True, exist_ok=True)

    bwrap_path = get_bwrap_path()

    return [
        bwrap_path,
        "--unshare-user",
        "--unshare-pid",
        "--unshare-uts",
        "--ro-bind", "/usr", "/usr",
        "--ro-bind", "/lib", "/lib",
        "--ro-bind", "/bin", "/bin",
        "--ro-bind", "/sbin", "/sbin",
        "--tmpfs", str(sandbox_dir),
        "--dev", "/dev",
        "--proc", "/proc",
        "--ro-bind", "/etc/resolv.conf", "/etc/resolv.conf",
        "--chdir", str(sandbox_dir),
        "--hostname", f"sandbox-{session_id[:8]}",
        "node",
        cli_path,
    ]


def check_bwrap() -> bool:
    try:
        get_bwrap_path()
        return True
    except RuntimeError:
        return False
