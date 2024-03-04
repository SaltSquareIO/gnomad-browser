import React, { useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { TranscriptPlot } from '@gnomad/track-transcripts'

import {
  DatasetId,
  transcriptsHaveExomeCoverage,
  labelForDataset,
  ReferenceGenome,
} from '@gnomad/dataset-metadata/metadata'
import ConstraintTable from '../ConstraintTable/ConstraintTable'

import DocumentTitle from '../DocumentTitle'
import GeneFlags from '../GenePage/GeneFlags'
import GnomadPageHeading from '../GnomadPageHeading'
import InfoButton from '../help/InfoButton'
import RegionViewer from '../RegionViewer/ZoomableRegionViewer'
import { TrackPage, TrackPageSection } from '../TrackPage'
import { useWindowSize } from '../windowSize'

import MitochondrialTranscriptCoverageTrack from './MitochondrialTranscriptCoverageTrack'
import MitochondrialVariantsInTranscript from './MitochondrialVariantsInTranscript'
import TranscriptCoverageTrack from './TranscriptCoverageTrack'
import TranscriptInfo from './TranscriptInfo'
import TranscriptTrack from './TranscriptTrack'
import VariantsInTranscript from './VariantsInTranscript'
import { GeneMetadata, Strand } from '../GenePage/GenePage'
import { GnomadConstraint } from '../ConstraintTable/GnomadConstraintTable'
import { ExacConstraint } from '../ConstraintTable/ExacConstraintTable'
import { GtexTissueExpression } from '../GenePage/TranscriptsTissueExpression'
import { Variant, ClinvarVariant } from '../VariantPage/VariantPage'
import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import { ControlPanel, Legend, LegendItemWrapper, Label, CheckboxInput, LegendSwatch } from '../ChartStyles'

export type Exon = {
  feature_type: string
  start: number
  stop: number
}

export type Transcript = {
  transcript_id: string
  transcript_version: string
  reference_genome: ReferenceGenome
  chrom: string
  strand: Strand
  start: number
  stop: number
  exons: Exon[]
  gnomad_constraint: GnomadConstraint | null
  exac_constraint: ExacConstraint | null
  gene: GeneMetadata
  gtex_tissue_expression: GtexTissueExpression | null
  variants: Variant[]
  mitochondrial_variants: MitochondrialVariant[]
  clinvar_variants: ClinvarVariant[]
}

const TranscriptInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 1em;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  /* Matches responsive styles in AttributeList */
  @media (max-width: 600px) {
    align-items: stretch;
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

type Props = {
  datasetId: DatasetId
  transcript: Transcript
}

const TranscriptPage = ({ datasetId, transcript }: Props) => {
  const [includeUTRs, setIncludeUTRs] = useState(false)

  const { width: windowWidth } = useWindowSize()
  const isSmallScreen = windowWidth < 900

  // Subtract 30px for padding on Page component
  const regionViewerWidth = windowWidth - 30

  const cdsCompositeExons = transcript.exons.filter((exon) => exon.feature_type === 'CDS')
  const hasCodingExons = cdsCompositeExons.length > 0
  const hasUTRs = transcript.exons.some((exon) => exon.feature_type === 'UTR')

  const isCodingTranscript = transcript.exons.some((exon) => exon.feature_type === 'CDS')

  const regionViewerRegions = transcript.exons
    .filter(
      (exon) =>
        exon.feature_type === 'CDS' ||
        (exon.feature_type === 'UTR' && includeUTRs) ||
        (exon.feature_type === 'exon' && !isCodingTranscript)
    )
    .map((exon) => ({
      start: Math.max(1, exon.start - 75),
      stop: exon.stop + 75,
    }))

  const [zoomRegion, setZoomRegion] = useState(null)

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
          <div style={{ maxWidth: '50%' }}>
            <TranscriptInfo transcript={transcript} />
            <GeneFlags gene={transcript.gene} />
          </div>
          <div>
            <h2>Constraint {transcript.chrom !== 'M' && <InfoButton topic="constraint" />}</h2>
            <ConstraintTable datasetId={datasetId} geneOrTranscript={transcript} />
          </div>
        </TranscriptInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        contextType="transcript"
        leftPanelWidth={115}
        width={regionViewerWidth}
        regions={regionViewerRegions}
        rightPanelWidth={isSmallScreen ? 0 : 80}
        renderOverview={({ scalePosition, width: overviewWidth }: any) => (
          <TranscriptPlot
            height={10}
            scalePosition={scalePosition}
            showNonCodingExons
            showUTRs={includeUTRs}
            transcript={transcript}
            width={overviewWidth}
          />
        )}
        zoomRegion={zoomRegion}
        onChangeZoomRegion={setZoomRegion}
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
            includeExomeCoverage={transcriptsHaveExomeCoverage(datasetId)}
          />
        )}

        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ControlPanel marginLeft={100} width={regionViewerWidth - 100 - (isSmallScreen ? 0 : 80)}>
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
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
                  onChange={(e: any) => {
                    setIncludeUTRs(e.target.checked)
                  }}
                />
                Untranslated regions (UTRs)
                <LegendSwatch
                  color={transcriptFeatureAttributes.UTR.fill}
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
            zoomRegion={zoomRegion}
          />
        ) : (
          <VariantsInTranscript
            datasetId={datasetId}
            // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; includeUTRs: boolean; t... Remove this comment to see the full error message
            includeUTRs={includeUTRs}
            transcript={transcript}
            zoomRegion={zoomRegion}
          />
        )}
      </RegionViewer>
    </TrackPage>
  )
}

export default TranscriptPage
