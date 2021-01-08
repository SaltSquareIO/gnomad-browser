import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { Redirect } from 'react-router-dom'
import styled from 'styled-components'

import { RegionViewer } from '@gnomad/region-viewer'

import ConstraintTable from '../ConstraintTable/ConstraintTable'
import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import { TrackPage, TrackPageSection } from '../TrackPage'

import MitochondrialTranscriptCoverageTrack from './MitochondrialTranscriptCoverageTrack'
import MitochondrialVariantsInTranscript from './MitochondrialVariantsInTranscript'
import TranscriptCoverageTrack from './TranscriptCoverageTrack'
import TranscriptInfo from './TranscriptInfo'
import TranscriptTrack from './TranscriptTrack'
import VariantsInTranscript from './VariantsInTranscript'

const TranscriptInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  /* Matches responsive styles in AttributeList */
  @media (max-width: 600px) {
    align-items: stretch;
  }
`

const ControlPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: ${props => props.width}px;
  margin-left: ${props => props.marginLeft}px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    margin-left: 0;
  }
`

const Legend = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0.5em 0;
  list-style-type: none;
`

const LegendItemWrapper = styled.li`
  display: flex;
  align-items: stretch;
  margin-left: 1em;
`

const Label = styled.label`
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: center;
`

const CheckboxInput = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5em;
`

const LegendSwatch = styled.span`
  display: flex;
  align-items: center;
  width: 16px;
  margin-left: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: ${props => props.height}px;
    background: ${props => props.color};
  }
`

const transcriptFeatureAttributes = {
  exon: {
    fill: '#bdbdbd',
    height: 4,
  },
  CDS: {
    fill: '#424242',
    height: 10,
  },
  UTR: {
    fill: '#424242',
    height: 4,
  },
}

const TranscriptPage = ({ datasetId, transcript, width }) => {
  const [includeUTRs, setIncludeUTRs] = useState(false)

  const { gene } = transcript

  // Cannot query structural variants by transcript, redirect to gene page
  if (datasetId.startsWith('gnomad_sv')) {
    return <Redirect to={`/gene/${gene.gene_id}?dataset=${datasetId}`} />
  }

  const smallScreen = width < 900

  // Subtract 30px for padding on Page component
  const regionViewerWidth = width - 30

  const cdsCompositeExons = transcript.exons.filter(exon => exon.feature_type === 'CDS')
  const hasCodingExons = cdsCompositeExons.length > 0
  const hasUTRs = transcript.exons.some(exon => exon.feature_type === 'UTR')

  const isCodingTranscript = transcript.exons.some(exon => exon.feature_type === 'CDS')

  const regionViewerRegions = transcript.exons.filter(
    exon =>
      exon.feature_type === 'CDS' ||
      (exon.feature_type === 'UTR' && includeUTRs) ||
      (exon.feature_type === 'exon' && !isCodingTranscript)
  )

  return (
    <TrackPage>
      <TrackPageSection>
        <DocumentTitle title={`${transcript.transcript_id} | ${labelForDataset(datasetId)}`} />
        <GnomadPageHeading
          selectedDataset={datasetId}
          datasetOptions={{
            includeShortVariants: true,
            includeStructuralVariants: false,
            includeExac: transcript.chrom !== 'M',
            includeGnomad2: transcript.chrom !== 'M',
            includeGnomad3: true,
            includeGnomad3Subsets: transcript.chrom !== 'M',
          }}
        >
          Transcript: {transcript.transcript_id}.{transcript.transcript_version}
        </GnomadPageHeading>
        <TranscriptInfoColumnWrapper>
          <TranscriptInfo transcript={transcript} />
          <div>
            <h2>Constraint {transcript.chrom !== 'M' && <InfoButton topic="constraint" />}</h2>
            <ConstraintTable datasetId={datasetId} geneOrTranscript={transcript} />
          </div>
        </TranscriptInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        leftPanelWidth={115}
        width={regionViewerWidth}
        padding={75}
        regions={regionViewerRegions}
        rightPanelWidth={smallScreen ? 0 : 160}
      >
        {transcript.chrom === 'M' ? (
          <MitochondrialTranscriptCoverageTrack
            datasetId={datasetId}
            transcriptId={transcript.transcript_id}
          />
        ) : (
          <TranscriptCoverageTrack
            datasetId={datasetId}
            transcriptId={transcript.transcript_id}
            includeExomeCoverage={!datasetId.startsWith('gnomad_r3')}
          />
        )}

        <ControlPanel marginLeft={100} width={regionViewerWidth - 100 - (smallScreen ? 0 : 160)}>
          Include:
          <Legend>
            <LegendItemWrapper>
              <Label htmlFor="include-cds-regions">
                <CheckboxInput
                  checked={hasCodingExons}
                  disabled
                  id="include-cds-regions"
                  onChange={() => {}}
                />
                Coding regions (CDS)
                <LegendSwatch
                  color={transcriptFeatureAttributes.CDS.fill}
                  height={transcriptFeatureAttributes.CDS.height}
                />
              </Label>
            </LegendItemWrapper>

            <LegendItemWrapper>
              <Label htmlFor="include-utr-regions">
                <CheckboxInput
                  checked={includeUTRs}
                  disabled={!hasUTRs}
                  id="include-utr-regions"
                  onChange={e => {
                    setIncludeUTRs(e.target.checked)
                  }}
                />
                Untranslated regions (UTRs)
                <LegendSwatch
                  color={transcriptFeatureAttributes.UTR.fill}
                  height={transcriptFeatureAttributes.UTR.height}
                />
              </Label>
            </LegendItemWrapper>

            <LegendItemWrapper>
              <Label htmlFor="include-nc-regions">
                <CheckboxInput
                  checked={!isCodingTranscript}
                  disabled
                  id="include-nc-regions"
                  onChange={() => {}}
                />
                Non-coding regions
                <LegendSwatch
                  color={transcriptFeatureAttributes.exon.fill}
                  height={transcriptFeatureAttributes.exon.height}
                />
              </Label>
            </LegendItemWrapper>
          </Legend>
        </ControlPanel>

        <div style={{ margin: '1em 0' }}>
          <TranscriptTrack transcript={transcript} showUTRs={includeUTRs} />
        </div>

        {transcript.chrom === 'M' ? (
          <MitochondrialVariantsInTranscript
            datasetId={datasetId}
            transcript={transcript}
            width={regionViewerWidth}
          />
        ) : (
          <VariantsInTranscript
            datasetId={datasetId}
            includeUTRs={includeUTRs}
            transcript={transcript}
            width={regionViewerWidth}
          />
        )}
      </RegionViewer>
    </TrackPage>
  )
}

TranscriptPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  transcript: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
    transcript_version: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    strand: PropTypes.oneOf(['+', '-']).isRequired,
    exons: PropTypes.arrayOf(
      PropTypes.shape({
        feature_type: PropTypes.string.isRequired,
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
      })
    ).isRequired,
    gene: PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
      gene_version: PropTypes.string.isRequired,
      reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
      symbol: PropTypes.string.isRequired,
      name: PropTypes.string,
      strand: PropTypes.oneOf(['+', '-']).isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
      canonical_transcript_id: PropTypes.string,
      mane_select_transcript: PropTypes.shape({
        ensembl_id: PropTypes.string.isRequired,
        ensembl_version: PropTypes.string.isRequired,
        refseq_id: PropTypes.string.isRequired,
        refseq_version: PropTypes.string.isRequired,
      }),
    }).isRequired,
  }).isRequired,
  width: PropTypes.number.isRequired,
}

export default TranscriptPage
