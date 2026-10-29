import { gp2 as gp2Model } from '@asap-hub/model';
import {
  Link,
  CtaCard,
  pixels,
  editIcon,
  VersionIcon,
  duplicateIcon,
  mail,
  RelatedEventsCard,
  RelatedResearchCard,
  SharedResearchDetailsTagsCard,
  OutputVersions,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { OutputCard } from '../organisms';
import OutputAdditionalInformationCard from '../organisms/OutputAdditionalInformationCard';
import OutputCohortsCard from '../organisms/OutputCohortsCard';
import PageNotifications from './PageNotifications';
import { getIconForDocumentType, getSourceIcon } from '../utils';
import { layoutContentStyles } from '../layout';

const { rem, mobileScreen } = pixels;
const { createMailTo, INVITE_SUPPORT_EMAIL } = mail;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  overflow: 'auto',
});

const commonStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
};

const commonMediaQueries = {
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    ...commonStyles,
    width: 'auto',
  },
};

const buttonsContainer = css({
  ...commonStyles,
  flexFlow: 'column',
  gap: rem(16),
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    flexFlow: 'row',
    width: '100%',
  },
});

const leftButtons = css({
  ...commonStyles,
  ...commonMediaQueries,
});

type OutputDetailPageProps = Pick<
  gp2Model.OutputResponse,
  | 'addedDate'
  | 'authors'
  | 'created'
  | 'documentType'
  | 'id'
  | 'lastUpdatedPartial'
  | 'link'
  | 'mainEntity'
  | 'projects'
  | 'relatedOutputs'
  | 'subtype'
  | 'title'
  | 'type'
  | 'workingGroups'
  | 'relatedEvents'
  | 'sharingStatus'
  | 'gp2Supported'
  | 'publishDate'
  | 'contributingCohorts'
  | 'description'
  | 'tags'
  | 'versions'
> & {
  isAdministrator: boolean;
};
const OutputDetailPage: React.FC<OutputDetailPageProps> = ({
  isAdministrator,
  ...output
}: OutputDetailPageProps) => (
  <PageNotifications page="output">
    {(notification) => (
      <article
        css={[
          layoutContentStyles,
          notification ? { position: 'relative', marginTop: rem(48) } : {},
        ]}
      >
        <div css={containerStyles}>
          {isAdministrator ? (
            <div css={buttonsContainer}>
              <div css={leftButtons}>
                <Link
                  noMargin
                  href={
                    gp2Routing
                      .outputs({})
                      .output({ outputId: output.id })
                      .edit({}).$
                  }
                  buttonStyle
                  small
                  primary
                >
                  {editIcon} Edit
                </Link>
              </div>
              <div css={leftButtons}>
                <Link
                  noMargin
                  href={
                    output.mainEntity.type === 'WorkingGroups'
                      ? gp2Routing
                          .workingGroups({})
                          .workingGroup({
                            workingGroupId: output.mainEntity.id,
                          })
                          .duplicateOutput({
                            outputId: output.id,
                          }).$
                      : output.mainEntity.type === 'Projects'
                        ? gp2Routing
                            .projects({})
                            .project({ projectId: output.mainEntity.id })
                            .duplicateOutput({ outputId: output.id }).$
                        : undefined
                  }
                  buttonStyle
                  small
                  primary
                >
                  {duplicateIcon} Duplicate
                </Link>
              </div>
              <div css={leftButtons}>
                <Link
                  noMargin
                  href={
                    gp2Routing
                      .outputs({})
                      .output({ outputId: output.id })
                      .version({}).$
                  }
                  buttonStyle
                  small
                  primary
                >
                  <VersionIcon />
                  Add Version
                </Link>
              </div>
            </div>
          ) : null}
          <OutputCard {...output} detailedView />
          {(output.description || !!output.tags.length) && (
            <SharedResearchDetailsTagsCard
              tags={output.tags.map((tag) => tag.name)}
              displayDescription={!!output.description}
              descriptionMD={output.description}
            />
          )}
          <OutputCohortsCard contributingCohorts={output.contributingCohorts} />
          {output.relatedOutputs?.length > 0 && (
            <RelatedResearchCard
              title="Related Outputs"
              description="Find all outputs that contributed to this one."
              relatedResearch={output.relatedOutputs}
              getIconForDocumentType={getIconForDocumentType}
              getSourceIcon={getSourceIcon}
              tableTitles={['Type of Output', 'Output Name', 'Source Type']}
            />
          )}
          <RelatedEventsCard
            relatedEvents={output.relatedEvents}
            truncateFrom={3}
            hub="GP2"
          />
          {output.versions && <OutputVersions versions={output.versions} />}
          <OutputAdditionalInformationCard {...output} />
          <CtaCard
            href={createMailTo(INVITE_SUPPORT_EMAIL)}
            buttonText="Contact Tech Support"
          >
            <strong>Have additional questions?</strong>
            <br /> Reach out to tech support if you need help.
          </CtaCard>
        </div>
      </article>
    )}
  </PageNotifications>
);

export default OutputDetailPage;
