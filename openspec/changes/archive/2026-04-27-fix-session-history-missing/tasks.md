## 1. Fix WebUI Navigation Bug

- [x] 1.1 Add `streamSessionRef.current = sessionId` in `handleSelect` (`codenano-webui/src/App.tsx:342`)

## 2. Fix API Registry Check

- [x] 2.1 Update `/history` endpoint to return 404 when session not in registry (`codenano-api/src/routes/sessions.ts:227`)

## 3. Manual Testing

- [ ] 3.1 Create a new session and send a message
- [ ] 3.2 Press F5 to refresh the page
- [ ] 3.3 Click the session in the sidebar
- [ ] 3.4 Verify the history is displayed correctly
- [ ] 3.5 Verify JSONL file contains metadata and message entries
