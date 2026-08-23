import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// @testing-library/react's auto-cleanup relies on a global `afterEach` being
// registered by the test framework at import time. Vitest only exposes that
// globally when `test.globals: true` is set (it isn't here, on purpose —
// test files import describe/it/expect explicitly), so without this every
// component test after the first would render on top of the previous
// test's leftover DOM.
afterEach(() => {
  cleanup()
})
