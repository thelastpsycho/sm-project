import { describe, expect, it } from 'vitest'
import { computeDuplicateMatches, datesOverlap, findDuplicates, normalizeCompany } from '../crmDuplicates'
import type { Deal } from '@/types/crm'

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'd1',
    company: 'Acme Corp',
    segment: 'MICE',
    leadSource: 'Email',
    ownerId: 'owner@example.com',
    ownerName: 'Owner',
    stage: 'New',
    arrivalDate: '2026-03-10',
    checkoutDate: '2026-03-12',
    currency: 'IDR',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides
  }
}

describe('normalizeCompany', () => {
  it('trims and lowercases', () => {
    expect(normalizeCompany('  Acme Corp  ')).toBe('acme corp')
  })
  it('handles undefined/null gracefully', () => {
    expect(normalizeCompany(undefined as unknown as string)).toBe('')
  })
})

describe('datesOverlap', () => {
  it('is true when ranges overlap partially', () => {
    expect(datesOverlap('2026-03-10', '2026-03-15', '2026-03-12', '2026-03-20')).toBe(true)
  })

  it('is false when one stay checks out on the other stay arrival date', () => {
    expect(datesOverlap('2026-03-10', '2026-03-12', '2026-03-12', '2026-03-15')).toBe(false)
  })

  it('is true when one stay is fully contained inside another', () => {
    expect(datesOverlap('2026-03-10', '2026-03-20', '2026-03-12', '2026-03-15')).toBe(true)
  })

  it('is false when ranges do not overlap', () => {
    expect(datesOverlap('2026-03-10', '2026-03-12', '2026-03-13', '2026-03-15')).toBe(false)
  })

  it('is false when any date is missing', () => {
    expect(datesOverlap(undefined, '2026-03-12', '2026-03-10', '2026-03-15')).toBe(false)
    expect(datesOverlap('2026-03-10', undefined, '2026-03-10', '2026-03-15')).toBe(false)
  })

  it('is false for zero-night or reversed ranges', () => {
    expect(datesOverlap('2026-03-12', '2026-03-12', '2026-03-10', '2026-03-15')).toBe(false)
    expect(datesOverlap('2026-03-15', '2026-03-12', '2026-03-10', '2026-03-20')).toBe(false)
  })
})

describe('findDuplicates', () => {
  const pool = [
    makeDeal({ id: 'a', company: 'Acme Corp', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }),
    makeDeal({ id: 'b', company: 'ACME CORP', arrivalDate: '2026-03-11', checkoutDate: '2026-03-14' }),
    makeDeal({ id: 'c', company: 'Acme Corp', stage: 'Lost', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }),
    makeDeal({ id: 'd', company: 'Other Co', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' })
  ]

  it('matches case/whitespace-insensitively with overlapping dates', () => {
    const matches = findDuplicates({ company: 'acme corp ', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }, pool)
    expect(matches.map(d => d.id).sort()).toEqual(['a', 'b'])
  })

  it('does not match back-to-back stays for the same company', () => {
    const matches = findDuplicates({ company: 'Acme Corp', arrivalDate: '2026-03-14', checkoutDate: '2026-03-16' }, pool)
    expect(matches.some(d => d.id === 'b')).toBe(false)
  })

  it('excludes Lost deals by default', () => {
    const matches = findDuplicates({ company: 'Acme Corp', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }, pool)
    expect(matches.some(d => d.id === 'c')).toBe(false)
  })

  it('includes Lost deals when includeLost is true', () => {
    const matches = findDuplicates(
      { company: 'Acme Corp', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' },
      pool,
      { includeLost: true }
    )
    expect(matches.some(d => d.id === 'c')).toBe(true)
  })

  it('excludes a given id (self-exclusion on edit)', () => {
    const matches = findDuplicates(
      { company: 'Acme Corp', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' },
      pool,
      { excludeId: 'a', includeLost: true }
    )
    expect(matches.some(d => d.id === 'a')).toBe(false)
    expect(matches.some(d => d.id === 'b')).toBe(true)
  })

  it('returns nothing for an empty company', () => {
    expect(findDuplicates({ company: '  ', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }, pool)).toEqual([])
  })
})

describe('computeDuplicateMatches', () => {
  it('pairs matching deals both directions and excludes Lost deals from the pool', () => {
    const deals = [
      makeDeal({ id: 'a', company: 'Acme Corp', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }),
      makeDeal({ id: 'b', company: 'Acme Corp', arrivalDate: '2026-03-11', checkoutDate: '2026-03-14' }),
      makeDeal({ id: 'c', company: 'Acme Corp', stage: 'Lost', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' })
    ]
    const map = computeDuplicateMatches(deals)
    expect(map.get('a')?.map(d => d.id)).toEqual(['b'])
    expect(map.get('b')?.map(d => d.id)).toEqual(['a'])
    expect(map.has('c')).toBe(false)
  })

  it('does not pair back-to-back stays', () => {
    const deals = [
      makeDeal({ id: 'a', company: 'Acme Corp', arrivalDate: '2026-03-10', checkoutDate: '2026-03-12' }),
      makeDeal({ id: 'b', company: 'Acme Corp', arrivalDate: '2026-03-12', checkoutDate: '2026-03-14' })
    ]
    expect(computeDuplicateMatches(deals).size).toBe(0)
  })

  it('returns an empty map when nothing matches', () => {
    const deals = [makeDeal({ id: 'a' }), makeDeal({ id: 'b', company: 'Other Co' })]
    expect(computeDuplicateMatches(deals).size).toBe(0)
  })
})
