# Settings slide-in panel

## Problem

The gear icon on Dashboard and Practice currently does `router.push('/settings')` — a full page navigation. It should instead open Settings as a GSAP-animated panel that slides in from the right, over the current page, with no URL change.

## Scope

- Dashboard (`src/app/dashboard/page.tsx`) and Practice (`src/app/practice/page.tsx`) gear icons both switch to the overlay.
- The standalone `/settings` route is untouched in behavior — it's still used for the first-run onboarding redirect after signup (`/settings?firstRun=true`) and any direct link/bookmark.
- Saving from the overlay closes the panel and stays on the current page (Dashboard or Practice) — it does not navigate to Dashboard. Only the standalone onboarding route keeps the "Save → push to /dashboard" behavior.

## Architecture

### `src/components/settings/SettingsForm.tsx` (new, extracted)

All the load/save logic and section UI currently inline in `SettingsInner` (`src/app/settings/page.tsx`), extracted into a shared component so the page and the overlay render identical form logic instead of duplicating it. Sections: HSK level, grading strictness, session counters (sentences/round, rounds before unlock, words per unlock), display prefs (show pinyin, show hints), theme picker.

Props:
- `mode: 'onboarding' | 'edit'` — controls header copy ("Welcome to 汉字练习" + subhead vs "Settings") and the CTA label ("Start practicing →" vs "Save settings").
- `onDone: () => void` — called after a successful save.
- `onBack?: () => void` — when present, header renders a back/close affordance that calls it.

Internally unchanged from today's `SettingsInner`: `loadSettings` effect (DB fetch with localStorage fallback), `handleSave` (upsert to `settings` table, first-run vocab seed via `/api/words` when `mode === 'onboarding'`), theme state wired to `applyTheme`.

### `src/app/settings/page.tsx` (simplified)

Becomes a thin wrapper: full-page layout (`min-h-screen px-4 py-10 max-w-lg mx-auto`), reads `isFirstRun` from search params same as today, renders:

```tsx
<SettingsForm
  mode={isFirstRun ? 'onboarding' : 'edit'}
  onDone={() => router.push('/dashboard')}
  onBack={isFirstRun ? undefined : () => router.back()}
/>
```

Identical behavior to today's page — this is a pure refactor of this file, no behavior change.

### `src/components/settings/SettingsPanel.tsx` (new)

Overlay wrapper, structurally mirrors `src/components/vocab/VocabSheet.tsx`:

- `overlayRef` (backdrop) + `panelRef` (sliding panel), both refs animated via `gsap.context` in a mount `useEffect`.
- Mount animation: overlay `opacity 0→1` (0.3s); panel `x: '100%' → '0%'` (0.45s, `power3.out`).
- `handleClose()`: GSAP timeline reversing both (panel `x → '100%'`, 0.35s `power3.in`; overlay fade out 0.2s, overlapped `-=0.2`), `onComplete` calls the `onClose` prop.
- Backdrop click closes: `onClick={e => { if (e.target === overlayRef.current) handleClose() }}` (same guard as `VocabSheet`, so clicks inside the panel don't bubble-close it).
- Panel container: `fixed inset-y-0 right-0`, full-width on small viewports, `max-width: 420px` on larger viewports, `overflow-y-auto` for the scrollable form.
- Renders `<SettingsForm mode="edit" onDone={handleClose} onBack={handleClose} />` inside the panel.

Props: `{ onClose: () => void }`.

### Call sites

`src/app/dashboard/page.tsx` and `src/app/practice/page.tsx`:
- Add `const [showSettings, setShowSettings] = useState(false)`.
- Gear button `onClick`: `router.push('/settings')` → `setShowSettings(true)`.
- Render `{showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}` alongside the pages' existing conditional overlays (`VocabSheet`, `UnlockModal`, etc.).

## Edge cases

- Settings are reloaded fresh every time the panel opens (same `loadSettings` effect as today), so the panel always reflects current DB state rather than stale cache.
- Theme picker inside the panel calls `applyTheme` immediately on click (existing behavior), so theme changes preview live even before Save is pressed.
- Opening Settings from Practice does not touch practice session state (draft, current sentence, streak) — the panel is a pure overlay on top; closing it (via Save, back, or backdrop click) returns to Practice exactly as it was.

## Out of scope

- No changes to the onboarding flow's redirect logic (`/auth/callback`, `signup/page.tsx`).
- No changes to `SettingsForm`'s actual fields, validation, or DB schema.
- No route-transition animation for direct `/settings` navigation — only the overlay path is animated.
