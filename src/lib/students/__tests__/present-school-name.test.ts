import { describe, it, expect } from 'vitest'
import { cleanSchoolName, filterPresentSchools, indexPresentSchools, parseSchoolListLine, presentSchoolKey, schoolSearchKeys } from '../present-school-name'

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

describe('filterPresentSchools', () => {
  const school = (id: number, name: string, aliases: string[] = []) => ({ id, name, aliases })
  const index = indexPresentSchools([
    school(1, 'DIOCESAN BOYS\' SCHOOL (SECONDARY)'),
    school(2, 'DIOCESAN GIRLS\' SCHOOL'),
    school(3, 'HARROW INTERNATIONAL SCHOOL HONG KONG (SECONDARY)'),
    school(4, 'ST. PAUL\'S CO-EDUCATIONAL COLLEGE'),
    school(5, 'ST. PAUL\'S COLLEGE'),
    school(6, 'THE CHURCH OF CHRIST IN CHINA KEI YUEN COLLEGE', ['CCC KEI YUEN COLLEGE']),
  ])
  const ids = (query: string, limit?: number) => filterPresentSchools(index, query, limit).matches.map((s) => s.id)

  it('ignores case and punctuation', () => {
    expect(ids('st pauls')).toEqual([4, 5])
    expect(ids("St. Paul's College")).toEqual([5, 4])
  })
  it('puts the exact spelling first and reports it', () => {
    const result = filterPresentSchools(index, 'st pauls college')
    expect(result.exact?.id).toBe(5)
    expect(result.matches.map((s) => s.id)).toEqual([5, 4])
    expect(filterPresentSchools(index, 'st pauls').exact).toBeNull()
  })
  it('finds a school by its alternative spelling', () => {
    expect(ids('ccc kei')).toEqual([6])
    expect(filterPresentSchools(index, 'CCC Kei Yuen College').exact?.id).toBe(6)
  })
  it('ranks spellings that start with the query before ones that contain it', () => {
    expect(ids('college')).toEqual([4, 5, 6])
    expect(ids('kei yuen')).toEqual([6])
    expect(ids('christ')).toEqual([6])
  })
  it('falls back to every typed word appearing somewhere', () => {
    expect(ids('harrow secondary')).toEqual([3])
    expect(ids('diocesan secondary')).toEqual([1])
  })
  it('caps the matches and says when there are more', () => {
    const result = filterPresentSchools(index, 'school', 1)
    expect(result.matches).toHaveLength(1)
    expect(result.more).toBe(true)
    expect(filterPresentSchools(index, 'school').more).toBe(false)
  })
  it('lists the first schools in name order for an empty query', () => {
    expect(ids('  ', 2)).toEqual([1, 2])
    expect(filterPresentSchools(index, '', 2).more).toBe(true)
  })
  it('finds nothing for a school not on the list', () => {
    expect(filterPresentSchools(index, 'Macau Anglican College')).toEqual({ matches: [], more: false, exact: null })
  })
})
