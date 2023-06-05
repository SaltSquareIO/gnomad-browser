const { isEmpty } = require('lodash')
const { fetchAllSearchResults } = require('../helpers/elasticsearch-helpers')

const GNOMAD_STRUCTURAL_VARIANTS_V3_INDEX = 'gnomad_structural_variants_v3'

// ================================================================================================
// Variant query
// ================================================================================================

const fetchStructuralVariantById = async (esClient, variantId) => {
  const response = await esClient.search({
    index: GNOMAD_STRUCTURAL_VARIANTS_V3_INDEX,
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id_upper_case: variantId.toUpperCase() } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value
  console.log(variant)
  if (!variant.freq['all'].ac) {
    return null
  }

  return {
    ...variant,
    ...variant.freq['all'],
    age_distribution:
      !isEmpty(variant.age_distribution.het) || !isEmpty(variant.age_distribution.hom)
        ? {
            het: isEmpty(variant.age_distribution.het) ? null : variant.age_distribution.het,
            hom: isEmpty(variant.age_distribution.hom) ? null : variant.age_distribution.hom,
          }
        : null,
    genotype_quality:
      !isEmpty(variant.genotype_quality.all) || !isEmpty(variant.genotype_quality.alt)
        ? {
            all: isEmpty(variant.genotype_quality.all) ? null : variant.genotype_quality.all,
            alt: isEmpty(variant.genotype_quality.alt) ? null : variant.genotype_quality.alt,
          }
        : null,
  }
}

// ================================================================================================
// Gene query
// ================================================================================================

const esFieldsToFetch = [
  'value.chrom',
  'value.chrom2',
  'value.consequences',
  'value.end',
  'value.end2',
  'value.filters',
  `value.freq`,
  'value.intergenic',
  'value.length',
  'value.pos',
  'value.pos2',
  'value.reference_genome',
  'value.type',
  'value.variant_id',
]

const fetchStructuralVariantsByGene = async (esClient, gene) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_STRUCTURAL_VARIANTS_V3_INDEX,
    type: '_doc',
    size: 10000,
    _source: esFieldsToFetch,
    body: {
      query: {
        bool: {
          filter: {
            term: { genes: gene.symbol },
          },
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit) => hit._source.value)
    .filter((variant) => variant.freq['all'].ac > 0)
    .map((variant) => {
      let majorConsequence = variant.consequences.find((csq) => csq.genes.includes(gene.symbol))
      if (majorConsequence) {
        majorConsequence = majorConsequence.consequence
      } else if (variant.intergenic) {
        majorConsequence = 'intergenic'
      }

      return {
        ...variant,
        ...variant.freq['all'],
        major_consequence: majorConsequence,
      }
    })
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchStructuralVariantsByRegion = async (esClient, region) => {
  const hits = await fetchAllSearchResults(esClient, {
    index: GNOMAD_STRUCTURAL_VARIANTS_V3_INDEX,
    type: '_doc',
    size: 10000,
    _source: esFieldsToFetch,
    body: {
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  { range: { xpos: { lte: region.xstop } } },
                  { range: { xend: { gte: region.xstart } } },
                ],
              },
            },
            {
              bool: {
                must: [
                  { range: { xpos2: { lte: region.xstop } } },
                  { range: { xend2: { gte: region.xstart } } },
                ],
              },
            },
          ],
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit) => hit._source.value)
    .filter((variant) => variant.freq['all'].ac > 0)
    .filter((variant) => {
      // Only include insertions if the start point falls within the requested region.
      if (variant.type === 'INS') {
        return (
          variant.chrom === region.chrom &&
          variant.pos >= region.start &&
          variant.pos <= region.stop
        )
      }

      // Only include interchromosomal variants (CTX, BND) if one of the endpoints falls within the requested region.
      // Some INS and CPX variants are also interchromosomal, but those can only be queried on their first position.
      if (variant.type === 'BND' || variant.type === 'CTX') {
        return (
          (variant.chrom === region.chrom &&
            variant.pos >= region.start &&
            variant.pos <= region.stop) ||
          (variant.chrom2 === region.chrom &&
            variant.pos2 >= region.start &&
            variant.pos2 <= region.stop)
        )
      }

      return true
    })
    .map((variant) => {
      let majorConsequence = null
      if (variant.consequences.length) {
        majorConsequence = variant.consequences[0].consequence
      } else if (variant.intergenic) {
        majorConsequence = 'intergenic'
      }

      return {
        ...variant,
        ...variant.freq['all'],
        major_consequence: majorConsequence,
      }
    })
}

module.exports = {
  fetchStructuralVariantById,
  fetchStructuralVariantsByGene,
  fetchStructuralVariantsByRegion,
}
