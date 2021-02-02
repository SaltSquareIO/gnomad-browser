import PropTypes from 'prop-types'
import React from 'react'

import Link from '../Link'

const LoFCurationResult = ({ result }) => {
  const { verdict, flags = [] } = result
  return (
    <>
      <Link to={`/gene/${result.gene_id}`}>{result.gene_symbol || result.gene_id}</Link>
      <div>Curated as {verdict}</div>
      {flags.length > 0 && <div>Contributing factors: {flags.join(', ')}</div>}
    </>
  )
}

const LoFCurationResultPropType = PropTypes.shape({
  gene_id: PropTypes.string.isRequired,
  gene_symbol: PropTypes.string,
  verdict: PropTypes.string.isRequired,
  flags: PropTypes.arrayOf(PropTypes.string),
})

LoFCurationResult.propTypes = {
  result: LoFCurationResultPropType.isRequired,
}

const VariantLoFCurationResults = ({ variant }) => {
  const numGenes = new Set(variant.lof_curations.map(c => c.gene_id)).size

  return (
    <div>
      This variant was manually curated in {numGenes} gene{numGenes !== 1 ? 's' : ''}.
      <ul>
        {variant.lof_curations.map(result => (
          <li key={result.gene_id}>
            <LoFCurationResult result={result} />
          </li>
        ))}
      </ul>
    </div>
  )
}

VariantLoFCurationResults.propTypes = {
  variant: PropTypes.shape({
    lof_curations: PropTypes.arrayOf(LoFCurationResultPropType).isRequired,
  }).isRequired,
}

export default VariantLoFCurationResults
