## Context

The codenano-webui has no i18n infrastructure. All user-facing strings are hard-coded English scattered across 6 components. The goal is a one-time localization to Simplified Chinese with zero new runtime dependencies.

## Goals / Non-Goals

**Goals:**
- Replace all visible English strings with Chinese equivalents
- Localize relative time display ("3 minutes ago" → "3 分钟前")
- Keep implementation minimal: one new file + edits to 6 existing files

**Non-Goals:**
- Language-switching runtime (no toggle, no Context Provider)
- Internationalization library (no i18next, react-intl, etc.)
- Translation of LLM-generated content (API-level, not UI concern)
- aria-label translation (only visible text is localized)

## Decisions

### Centralized string constants file

**Decision:** Create `src/lib/i18n.ts` exporting a `const i18n` object with all Chinese strings as properties, imported directly where needed.

**Alternatives considered:**
- `react-i18next` / `react-intl`: Overkill for single-language, adds bundle size and complexity
- Inline string replacement: Pollutes components with non-obvious hardcoded Chinese

**Rationale:** Zero new dependency, dead simple, easy to audit all strings in one place.

### Relative time with `Intl.RelativeTimeFormat('zh')`

**Decision:** Pass `'zh'` as the locale argument to the existing `relativeTime()` function in `lib/format.ts` at all call sites.

**Alternatives considered:**
- Add `Intl` locale detection: Unnecessary since locale is known to be Chinese
- Use a date formatting library: The existing `Intl` API is sufficient

### Single `i18n.ts` file, not per-component translation files

**Decision:** One flat object in `i18n.ts` is adequate for ~20 strings across 6 files.

**Rationale:** No build-time extraction, no namespace management overhead, no extra files.

## Risks / Trade-offs

- **Risk:** Future English strings added without translation fallbacks → hard to notice
  - **Mitigation:** No technical enforcement; rely on code review discipline
- **Risk:** Changing `relativeTime` call sites adds boilerplate
  - **Mitigation:** Trivial change (add second argument), bounded to ~5 call sites
