## 1. codenano CLI (JSON-RPC server)

- [x] 1.1 Create `codenano-cli/` TypeScript project (package.json, tsconfig.json)
- [x] 1.2 Create `codenano-cli/src/rpc-types.ts` — JSON-RPC types
- [x] 1.3 Create `codenano-cli/src/rpc-server.ts` — JSON-RPC 2.0 server over stdio
- [x] 1.4 Create `codenano-cli/src/index.ts` — CLI entry: init Agent, manage sessions, handle RPC methods
- [x] 1.5 Build (`npm run build`) and verify CLI starts, responds to `init` RPC

## 2. FastAPI 服务

- [x] 2.1 Create `fastapi/requirements.txt` — fastapi, uvicorn, python-dotenv, pyyaml
- [x] 2.2 Create `fastapi/.env.example` — ANTHROPIC_API_KEY, SB_TTL_MINUTES, etc.
- [x] 2.3 Create `fastapi/config.py` — load .env, validate required vars
- [x] 2.4 Create `fastapi/sandbox.py` — bwrap wrapper (spawn subprocess with bwrap args)
- [x] 2.5 Create `fastapi/rpc_client.py` — subprocess stdin/stdout JSON-RPC client
- [x] 2.6 Create `fastapi/session_manager.py` — SubprocessRegistry: spawn/kill CLI per session + TTL timer
- [x] 2.7 Create `fastapi/routes/sessions.py` — all REST endpoints
- [x] 2.8 Create `fastapi/main.py` — FastAPI app with lifespan (startup checks bwrap, shutdown kills all processes)

## 3. 手动测试

- [ ] 3.1 Verify bwrap is installed on the system
- [ ] 3.2 Start CLI manually: `node codenano-cli/dist/index.js`, send init RPC
- [ ] 3.3 Start FastAPI: `uvicorn main:app`, test create session → send message → SSE stream → close
- [ ] 3.4 Verify sandbox: bash writes confined to tmpfs, network blocked
- [ ] 3.5 Verify TTL: idle session cleaned up after timeout
- [ ] 3.6 Test concurrent sessions (multiple simultaneous)
