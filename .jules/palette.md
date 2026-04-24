## 2026-04-24 - Missing translation keys break typecheck
**Learning:** When adding accessibility labels to icon-only buttons via `useLanguage` hook and `t('...')` in this React Native app, adding the new key to `src/i18n/translations.ts` in the base language object (`it`) but missing it in other type-checked language objects (like `const en: typeof it = {...}`) will cause `npm run typecheck` to fail with TS2741.
**Action:** Always verify that newly added translation keys are duplicated across all language dictionary objects in `translations.ts` to satisfy TypeScript's strict type checking.
