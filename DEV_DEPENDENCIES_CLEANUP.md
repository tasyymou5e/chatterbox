# Dev Dependencies Cleanup

The following packages in `package.json` should be moved from `dependencies` to `devDependencies` for proper separation of production and development dependencies:

## Packages to Move

| Package | Reason |
|---------|--------|
| `@playwright/test` | E2E testing only |
| `@storybook/addon-a11y` | Storybook dev tooling |
| `@storybook/addon-essentials` | Storybook dev tooling |
| `@storybook/addon-interactions` | Storybook dev tooling |
| `@storybook/react-vite` | Storybook dev tooling |
| `storybook` | Storybook dev tooling |
| `@testing-library/jest-dom` | Testing only |
| `@testing-library/react` | Testing only |
| `@testing-library/user-event` | Testing only |
| `depcheck` | Dev utility |
| `npm-check-updates` | Dev utility |
| `rollup-plugin-visualizer` | Build analysis only |
| `jsdom` | Testing only |
| `react-is` | Storybook peer dependency |

## Why This Matters

While Vite tree-shakes correctly and these packages won't end up in the production bundle, proper categorization:

1. Documents which packages are for development vs production
2. Follows npm/node best practices
3. Makes dependency auditing cleaner
4. Allows for stricter production installs with `npm install --production`

## How to Apply

Since `package.json` cannot be directly edited, these changes need to be applied manually:

1. Open `package.json`
2. Move each package listed above from `dependencies` to `devDependencies`
3. Run `npm install` to update `package-lock.json`

## Estimated Bundle Impact

None - Vite already excludes dev-only packages from production builds. This is purely a documentation and best practices improvement.
