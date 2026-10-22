import { describe, it, expect } from 'vitest'
import { cleanSchoolName, parseSchoolListLine, presentSchoolKey, schoolSearchKeys } from '../present-school-name'

describe('presentSchoolKey', () => {
  it('gives every common spelling of a school the same key', () => {
    const key = presentSchoolKey("ST. PAUL'S COLLEGE")
    expect(key).toBe('ST PAULS COLLEGE')
    expect(presentSchoolKey("St Paul's College")).toBe(key)
    expect(presentSchoolKey('st paul’s  college ')).toBe(key)
    expect(presentSchoolKey('ST. PAUL’S COLLEGE')).toBe(key)
    expect(presentSchoolKey('ST PAUL‘S COLLEGE')).toBe(key)
    expect(presentSchoolKey('ST PAULʼS COLLEGE')).toBe(key)
  })
  it('drops dots and commas inside abbreviations and lists', () => {
    expect(presentSchoolKey('A.D.&F.D. OF POK OI HOSPITAL')).toBe('AD&FD OF POK OI HOSPITAL')
    expect(presentSchoolKey('ALLIANCE PRIMARY SCHOOL, KOWLOON TONG')).toBe('ALLIANCE PRIMARY SCHOOL KOWLOON TONG')
  })
  it('ignores a leading "The" but not one inside the name', () => {
    expect(presentSchoolKey('THE ISF ACADEMY')).toBe('ISF ACADEMY')
    expect(presentSchoolKey('the isf academy')).toBe('ISF ACADEMY')
    expect(presentSchoolKey('SCHOOL OF THE ARTS')).toBe('SCHOOL OF THE ARTS')
    expect(presentSchoolKey('THEODORE SCHOOL')).toBe('THEODORE SCHOOL')
  })
  it('keeps what tells two schools apart', () => {
    expect(presentSchoolKey('CHINESE INTERNATIONAL SCHOOL (PRIMARY)'))
      .not.toBe(presentSchoolKey('CHINESE INTERNATIONAL SCHOOL (SECONDARY)'))
    expect(presentSchoolKey('PO LEUNG KUK CAMÕES TAN SIU LIN PRIMARY SCHOOL')).toBe('PO LEUNG KUK CAMÕES TAN SIU LIN PRIMARY SCHOOL')
    expect(presentSchoolKey('Camo\u0303es'.normalize('NFD'))).toBe(presentSchoolKey('CAMÕES'))
  })
  it('is empty for blank input', () => {
    expect(presentSchoolKey('   ')).toBe('')
    expect(presentSchoolKey('...')).toBe('')
  })
})

describe('cleanSchoolName', () => {
  it('trims, collapses spaces and upper-cases like the list', () => {
    expect(cleanSchoolName('  Macau  Anglican   College ')).toBe('MACAU ANGLICAN COLLEGE')
    expect(cleanSchoolName('St Paul’s College')).toBe("ST PAUL'S COLLEGE")
  })
})

describe('parseSchoolListLine', () => {
  it('reads a plain line', () => {
    expect(parseSchoolListLine('ABERDEEN TECHNICAL SCHOOL')).toEqual({ name: 'ABERDEEN TECHNICAL SCHOOL', aliases: [] })
  })
  it('splits "A / B" into a name and an alternative spelling', () => {
    expect(parseSchoolListLine("ABERDEEN ST PETER'S CATHOLIC PRIMARY SCHOOL / ABERDEEN ST. PETER'S CATHOLIC PRIMARY SCHOOL")).toEqual({
      name: "ABERDEEN ST PETER'S CATHOLIC PRIMARY SCHOOL",
      aliases: ["ABERDEEN ST. PETER'S CATHOLIC PRIMARY SCHOOL"],
    })
  })
  it('strips the byte order mark and the carriage return', () => {
    expect(parseSchoolListLine('\uFEFFABERDEEN BAPTIST LUI MING CHOI COLLEGE\r'))
      .toEqual({ name: 'ABERDEEN BAPTIST LUI MING CHOI COLLEGE', aliases: [] })
  })
  it('keeps accented letters', () => {
    expect(parseSchoolListLine('PO LEUNG KUK CAMÕES TAN SIU LIN PRIMARY SCHOOL')?.name)
      .toBe('PO LEUNG KUK CAMÕES TAN SIU LIN PRIMARY SCHOOL')
  })
  it('accepts extra spaces around the separator', () => {
    expect(parseSchoolListLine('WAH YAN COLLEGE, HONG KONG  /  WAH YAN COLLEGE HONG KONG'))
      .toEqual({ name: 'WAH YAN COLLEGE, HONG KONG', aliases: ['WAH YAN COLLEGE HONG KONG'] })
  })
  it('skips blank lines', () => {
    expect(parseSchoolListLine('')).toBeNull()
    expect(parseSchoolListLine('  \r')).toBeNull()
    expect(parseSchoolListLine('\uFEFF\r')).toBeNull()
  })
})

describe('schoolSearchKeys', () => {
  it('lists the name key first and each key once', () => {
    expect(schoolSearchKeys("ABERDEEN ST PETER'S CATHOLIC PRIMARY SCHOOL", ["ABERDEEN ST. PETER'S CATHOLIC PRIMARY SCHOOL"]))
      .toEqual(['ABERDEEN ST PETERS CATHOLIC PRIMARY SCHOOL'])
    expect(schoolSearchKeys("ST. PAUL'S", ['ST PAUL’S', "St Paul's", '...'])).toEqual(['ST PAULS'])
  })
  it('keeps a genuinely different spelling as a second key', () => {
    expect(schoolSearchKeys('BUDDHIST LAM BING YIM MEMORIAL SCHOOL (SPONSORED BY THE HONG KONG BUDDHIST ASSOCIATION)', [
      'BUDDHIST LAM BING YIM MEMORIAL SCHOOL (SPSD BY HKBA)',
    ])).toEqual([
      'BUDDHIST LAM BING YIM MEMORIAL SCHOOL (SPONSORED BY THE HONG KONG BUDDHIST ASSOCIATION)',
      'BUDDHIST LAM BING YIM MEMORIAL SCHOOL (SPSD BY HKBA)',
    ])
  })
})
