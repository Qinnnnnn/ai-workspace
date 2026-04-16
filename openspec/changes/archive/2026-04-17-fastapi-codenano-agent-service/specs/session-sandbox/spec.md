## ADDED Requirements

### Requirement: bwrap sandbox per session

Each codenano CLI subprocess for a session SHALL be launched inside a bwrap sandbox. The sandbox SHALL provide filesystem isolation using the following mounts:

| Mount | Type | Purpose |
|-------|------|---------|
| `/usr`, `/lib`, `/bin`, `/sbin` | `--ro-bind` | Read-only system binaries and libraries |
| `/tmp/sandbox/{session_id}/` | `--tmpfs` | Read-write working directory (tmpfs, memory-backed) |
| `/dev` | `--dev` | Minimal device nodes |
| `/proc` | `--proc` | Process information (filtered) |

### Requirement: Network isolation

The bwrap sandbox SHALL disable all network access. The session SHALL NOT be able to make any outbound network connections.

### Requirement: Namespace isolation

The bwrap sandbox SHALL use `--unshare-user`, `--unshare-pid`, and `--unshare-uts` to create new namespaces, isolating the session's PID tree and hostname from the host.

### Requirement: Sandbox working directory

The session SHALL operate in `/tmp/sandbox/{session_id}/` as its working directory. All file writes from tools (e.g., BashTool, Write tool) SHALL be confined to this tmpfs mount.

### Requirement: Sandbox cleanup

When a session is closed, the sandbox's tmpfs mount SHALL be automatically cleaned up (bwrap process exit handles this naturally).

### Requirement: Sandbox invocation

The sandbox SHALL be invoked directly from the Python session_manager module, which spawns a subprocess running bwrap with the CLI command.
