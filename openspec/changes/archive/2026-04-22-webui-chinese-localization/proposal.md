## Why

The codenano-webui is currently entirely in English, but its target users are Chinese-speaking. All visible user-facing strings—button labels, placeholder text, dialogs, empty states, and loading messages—should be displayed in Simplified Chinese.

## What Changes

- All hard-coded English UI strings in `codenano-webui/src` are replaced with Chinese equivalents
- The `relativeTime` function in `lib/format.ts` is called with `'zh'` locale so time spans display in Chinese (e.g., "3 分钟前")
- No new dependencies, no language-switching infrastructure, no spec-level behavior changes

## Capabilities

### New Capabilities

- `webui-i18n-zh`: Localization of all user-facing strings in codenano-webui to Simplified Chinese, including button labels, placeholders, dialog text, empty states, loading messages, and relative time formatting.

### Modified Capabilities

<!-- No existing spec requirements change; this is a pure UI text change -->

## Impact

- **Modified**: `codenano-webui/src/App.tsx` — sidebar labels, delete dialog, aria-label text
- **Modified**: `codenano-webui/src/components/thread/ThreadShell.tsx` — welcome page, placeholders
- **Modified**: `codenano-webui/src/components/ChatList.tsx` — loading/empty states, delete menu item
- **Modified**: `codenano-webui/src/components/MessageBubble.tsx` — tool status labels
- **Modified**: `codenano-webui/src/components/thread/ThreadHeader.tsx` — aria-label text
- **Modified**: `codenano-webui/src/lib/format.ts` — pass `'zh'` locale to `Intl.RelativeTimeFormat`
- **Added**: `codenano-webui/src/lib/i18n.ts` — centralized Chinese string constants
