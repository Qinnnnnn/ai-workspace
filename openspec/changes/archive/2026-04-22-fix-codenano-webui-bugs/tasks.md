## 1. Fix crypto.randomUUID compatibility

- [x] 1.1 Create `src/lib/uuid.ts` with cross-browser UUID v4 generation using `crypto.getRandomValues()`
- [x] 1.2 Replace `crypto.randomUUID()` calls in `src/App.tsx` with `uuid()` import

## 2. Fix DELETE request Content-Type header

- [x] 2.1 Modify `src/api/client.ts` to only set `Content-Type: application/json` when `init?.body` is truthy

## 3. Verify fixes

- [ ] 3.1 Test sending a message in browser (no more `crypto.randomUUID is not a function` error)
- [ ] 3.2 Test deleting a session (DELETE request should succeed with 200)
