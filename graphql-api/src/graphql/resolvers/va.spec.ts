import { describe, expect, test } from '@jest/globals'

import {
  resolveVACohortAlleleFrequencies,
  resolveVAAllele,
  Allele as VAAllele,
  CohortAlleleFrequency,
} from './va'

const alleleEsDocument = {
  vrs: {
    ref: {
      allele_id: 'ga4gh:SQ.IAmTheRefStateID',
      start: 123,
      end: 234,
      state: 'G',
    },
    alt: {
      allele_id: 'ga4gh:SQ.IAmTheAltStateID',
      start: 124,
      end: 235,
      state: 'A',
    },
  },
}

const expectedAllele: VAAllele = {
  _id: 'ga4gh:SQ.IAmTheAltStateID',
  type: 'Allele',
  location: {
    _id: 'ga4gh:VSL.OogSNIt-1Z7HF4tbdm45IDLYc7-oSE2Y',
    type: 'SequenceLocation',
    sequence_id: '2mN7PzLXx-QQq2GVIODPRSkWmlwybsv0',
    interval: {
      type: 'SequenceInterval',
      start: { type: 'Number', value: 124 },
      end: { type: 'Number', value: 235 },
    },
  },
  state: {
    type: 'LiteralSequenceExpression',
    sequence: 'A',
  },
}

describe('resolveVAAllele', () => {
  test('parses a single allele correctly', async () => {
    const resolved = await resolveVAAllele(alleleEsDocument, null, null)
    expect(resolved).toEqual(expectedAllele)
  })
})

describe('resolveVACohortAlleleFrequency', () => {
  const exomeEsDocument = {
    ac: 5,
    an: 100,
    hemizygote_count: 2,
    homozygote_count: 3,
    faf95: { popmax: 0.123, popmax_population: 'afr' },
    ancestry_groups: [],
  }

  const variantESDocument = {
    ...alleleEsDocument,
    variant_id: '1-123-G-A',
    exome: exomeEsDocument,
    joint: { fafmax: { faf95_max: 0.234, faf95_max_gen_anc: 'amr' } },
  }

  test('parses a single CohortAlleleFrequency correctly', async () => {
    const resolved = await resolveVACohortAlleleFrequencies(variantESDocument, null, null)
    const expected: CohortAlleleFrequency[] = [
      {
        id: 'gnomad4:1-123-G-A',
        label: 'Overall Cohort Allele Frequency for 1-123-G-A',
        type: 'CohortAlleleFrequency',
        focusAllele: expectedAllele,
        derivedFrom: {
          id: 'gnomad4.1.0',
          type: 'DataSet',
          label: 'gnomAD v4.1.0',
          version: '4.1.0',
        },
        focusAlleleCount: 5,
        locusAlleleCount: 100,
        alleleFrequency: 0.05,
        cohort: { id: 'ALL', label: 'Overall', characteristics: null },
        ancillaryResults: {
          grpMaxFAF95: { frequency: 0.123, confidenceInterval: 0.95, groupId: 'afr' },
          jointGrpMaxFAF95: { frequency: 0.234, confidenceInterval: 0.95, groupId: 'amr' },
          homozygotes: 3,
          hemizygotes: 2,
        },
        subcohortFrequency: [],
      },
    ]

    expect(resolved).toEqual(expected)
  })

  test('has the correct subcohortAlleleFrequency when there are multiple CAFs', async () => {
    // Shuffled order of IDs is intentional here to better test sorting
    const subcohortIds = [
      'eur_XY',
      'XY',
      'ami_XX',
      'amr',
      'XX',
      'ami',
      'ami_XY',
      'amr_XX',
      'eur',
      'amr_XY',
      'eur_XX',
    ]
    const subcohortDocuments = subcohortIds.map((subcohortId) => ({
      ...exomeEsDocument,
      id: subcohortId,
    }))

    const fullDocument = {
      ...variantESDocument,
      exome: { ...exomeEsDocument, ancestry_groups: subcohortDocuments },
    }

    const resolved = await resolveVACohortAlleleFrequencies(fullDocument, null, null)
    expect(resolved && resolved.length === subcohortIds.length + 1).toEqual(true)

    const subcohortMap: Record<string, string[]> = resolved!.reduce(
      (acc, cohort) => ({
        ...acc,
        [cohort.id]: cohort.subcohortFrequency.map((subcohort) => subcohort.id),
      }),
      {}
    )

    expect(subcohortMap['gnomad4:1-123-G-A']!.sort()).toEqual(
      subcohortIds.map((cohortId) => `gnomad4:1-123-G-A.${cohortId}`).sort()
    )

    expect(subcohortMap['gnomad4:1-123-G-A.XX'].sort()).toEqual([
      'gnomad4:1-123-G-A.ami_XX',
      'gnomad4:1-123-G-A.amr_XX',
      'gnomad4:1-123-G-A.eur_XX',
    ])

    expect(subcohortMap['gnomad4:1-123-G-A.XY'].sort()).toEqual([
      'gnomad4:1-123-G-A.ami_XY',
      'gnomad4:1-123-G-A.amr_XY',
      'gnomad4:1-123-G-A.eur_XY',
    ])

    expect(subcohortMap['gnomad4:1-123-G-A.ami'].sort()).toEqual([
      'gnomad4:1-123-G-A.ami_XX',
      'gnomad4:1-123-G-A.ami_XY',
    ])

    expect(subcohortMap['gnomad4:1-123-G-A.amr'].sort()).toEqual([
      'gnomad4:1-123-G-A.amr_XX',
      'gnomad4:1-123-G-A.amr_XY',
    ])

    expect(subcohortMap['gnomad4:1-123-G-A.eur'].sort()).toEqual([
      'gnomad4:1-123-G-A.eur_XX',
      'gnomad4:1-123-G-A.eur_XY',
    ])

    expect(subcohortMap['gnomad4:1-123-G-A.ami_XX']).toEqual([])
    expect(subcohortMap['gnomad4:1-123-G-A.ami_XY']).toEqual([])
    expect(subcohortMap['gnomad4:1-123-G-A.amr_XX']).toEqual([])
    expect(subcohortMap['gnomad4:1-123-G-A.amr_XY']).toEqual([])
    expect(subcohortMap['gnomad4:1-123-G-A.eur_XX']).toEqual([])
    expect(subcohortMap['gnomad4:1-123-G-A.eur_XY']).toEqual([])
  })
})
