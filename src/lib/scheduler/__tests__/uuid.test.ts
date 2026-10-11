import { describe, it, expect } from 'vitest'
import { isUuid } from '../uuid'

const ID = '11111111-1111-4111-8111-111111111111'

describe('isUuid', () => {
  it('accepts lower and upper case uuids', () => {
    expect(isUuid('3f2a9c1e-8b7d-4e6f-9a10-0123456789ab')).toBe(true)
    expect(isUuid('3F2A9C1E-8B7D-4E6F-9A10-0123456789AB')).toBe(true)
  })

  it.each([
    ['a short id', '1234'],
    ['an empty string', ''],
    ['trailing characters', `${ID}x`],
    ['leading characters', ` ${ID}`],
    ['a trailing newline', `${ID}\n`],
    ['no dashes', ID.replaceAll('-', '')],
    ['non-hex characters', 'zzzzzzzz-1111-4111-8111-111111111111'],
    ['a closing parenthesis (filter injection)', `${ID})`],
    ['a comma-joined pair (filter injection)', `${ID},${ID}`],
    ['an appended filter clause', `${ID}),id.not.is.null`],
  ])('rejects %s', (_label, value) => {
    expect(isUuid(value)).toBe(false)
  })
})
