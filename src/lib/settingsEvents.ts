// Fired whenever a user-settings field (e.g. starting HSK level) is saved
// so already-mounted components that hold their own independent copy of
// settings (e.g. `Sidebar`'s own `useProgress()` instance, separate from
// the dashboard page's) can reload and stay in sync, instead of showing a
// stale value until a route change or full page refresh. Same pattern as
// `THEME_CHANGE_EVENT` in `./theme`.
export const SETTINGS_CHANGE_EVENT = 'hanzi-settings-change'
