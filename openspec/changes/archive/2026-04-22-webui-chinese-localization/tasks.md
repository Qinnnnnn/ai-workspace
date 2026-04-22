## 1. Create i18n constants file

- [x] 1.1 Create `codenano-webui/src/lib/i18n.ts` with all Chinese UI string constants

## 2. Update App.tsx

- [x] 2.1 Import `i18n` from `@/lib/i18n`
- [x] 2.2 Replace `"New Chat"` button label with `{i18n.newChat}`
- [x] 2.3 Replace `"Recent"` label with `{i18n.recent}`
- [x] 2.4 Replace delete dialog title with `{i18n.deleteConversation}`
- [x] 2.5 Replace delete dialog message with `{i18n.deleteConfirm}` (with interpolated label)
- [x] 2.6 Replace `"Cancel"` button with `{i18n.cancel}`
- [x] 2.7 Replace `"Delete"` button with `{i18n.delete}`

## 3. Update ThreadShell.tsx

- [x] 3.1 Import `i18n` from `@/lib/i18n`
- [x] 3.2 Replace `"Loading conversation…"` with `{i18n.loadingConversation}`
- [x] 3.3 Replace `"Waiting for response…"` placeholder with `{i18n.waitingForResponse}`
- [x] 3.4 Replace `"Type your message…"` placeholder with `{i18n.typeYourMessage}`
- [x] 3.5 Replace `"Opening a new chat…"` placeholder with `{i18n.openingNewChat}`
- [x] 3.6 Replace `"What's on your mind?"` with `{i18n.whatsOnYourMind}`
- [x] 3.7 Replace description text with `{i18n.conversationsPersisted}`

## 4. Update ChatList.tsx

- [x] 4.1 Import `i18n` from `@/lib/i18n`
- [x] 4.2 Replace `"Loading…"` with `{i18n.loading}`
- [x] 4.3 Replace `"No conversations yet"` with `{i18n.noConversationsYet}`
- [x] 4.4 Replace `"Delete"` menu item with `{i18n.delete}`

## 5. Update MessageBubble.tsx

- [x] 5.1 Import `i18n` from `@/lib/i18n`
- [x] 5.2 Replace `"running..."` with `{i18n.running}`
- [x] 5.3 Replace `"failed"` with `{i18n.failed}`
- [x] 5.4 Replace `"input: "` with `{i18n.input}`

## 6. Update format.ts call sites

- [x] 6.1 Find all call sites of `relativeTime()` in `ChatList.tsx`
- [x] 6.2 Pass `'zh'` as the second argument to `relativeTime()` at each call site

## 7. Verify

- [ ] 7.1 Run dev server and visually confirm all strings are in Chinese
- [ ] 7.2 Run `npm run build` to verify no type errors
