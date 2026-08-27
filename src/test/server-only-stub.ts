/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * `server-only` resolves to a module that throws unless the bundler picks its
 * react-server condition, which the test runner does not. Aliasing it here lets
 * server modules keep the marker — the thing that stops exceljs or puppeteer
 * being pulled into a client bundle — while still being unit testable.
 *
 * Wired up in vitest.config.ts. Intentionally empty.
 */
export {}
