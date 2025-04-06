/**
 * Unit tests for src/wait.ts
 */
import { withDefault } from '../src/util.js'

describe('util.ts', () => {
  it('return with default', async () => {
    expect(withDefault('', 'default')).toBe('default')
    expect(withDefault(undefined, 'default')).toBe('default')
  })
})
