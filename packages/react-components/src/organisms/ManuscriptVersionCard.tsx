import {
  ManuscriptCategory,
  ManuscriptImpact,
  ManuscriptVersion,
  quickCheckQuestions,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  article,
  AssociationList,
  Button,
  Caption,
  Divider,
  ExpandableText,
  formatDate,
  lead,
  Link,
  minusRectIcon,
  Pill,
  PencilIcon,
  plusRectIcon,
  Subtitle,
  colors,
} from '..';
import { paddingStyles } from '../card';
import ManuscriptFileSection from '../molecules/ManuscriptFileSection';
import UserTeamInfo from '../molecules/UserTeamInfo';
import { mobileScreen, rem } from '../pixels';
import { getTeams, getUserHref } from '../utils';
import ComplianceReportCard from './ComplianceReportCard';

type ManuscriptVersionCardProps = {
  version: ManuscriptVersion;
  manuscriptId: string;
  isActiveVersion?: boolean;
  isManuscriptContributor?: boolean;
  categories?: ManuscriptCategory[];
  impact?: ManuscriptImpact;
  openDiscussionTab: () => void;
  showTeamName?: boolean;
  getEditManuscriptHref?: (manuscriptId: string) => string | undefined;
};

const toastStyles = css({
  padding: `${rem(24)} ${rem(15)}`,
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(24),
  height: rem(24),
  paddingRight: rem(12),
});

const toastHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    alignItems: 'flex-start',
  },
});

const toastContentStyles = css({
  paddingLeft: rem(56),
  paddingTop: rem(9),
});

const titleContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  gap: rem(16),

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: rem(8),
  },
});

const editIconStyles = css({
  width: 'min-content',
  minWidth: 'min-content',
  flexGrow: 0,
  height: 'min-content',
});

const fileDividerStyles = css({
  display: 'block',
  margin: `${rem(4)} 0`,
});

const dividerStyles = css({
  display: 'block',
  margin: `${rem(20)} 0`,
});

const quickCheckContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  marginTop: rem(20),
  marginBottom: rem(36),
  gap: rem(36),
});

const quickCheckStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const quickCheckDetailsStyles = css({
  color: lead.rgb,
});

const additionalInformationListStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: `${rem(6)} 0`,
});
const additionalInformationEntryStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  columnGap: rem(24),
  padding: `${rem(8)} 0`,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
  },
});
const additionalInformationValueStyles = css({
  textAlign: 'right',
  color: lead.rgb,
  overflowWrap: 'anywhere',

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    marginTop: `${rem(12)}`,
    textAlign: 'inherit',
  },
});
const userContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: rem(8),
  paddingTop: rem(32),
});

const updatedByAndEditContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  gap: rem(16),

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
  },
});

const updatedByContainerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
});

const updatedByTextStyles = css({
  display: 'inline-flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  alignSelf: 'flex-end',
  gap: rem(6),

  [`@media (max-width: ${mobileScreen.max}px)`]: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
});

const hasAdditionalInfo = (version: ManuscriptVersion) =>
  version.preprintDoi || version.publicationDoi || version.otherDetails;

const ManuscriptVersionCard: React.FC<ManuscriptVersionCardProps> = ({
  version,
  manuscriptId,
  isActiveVersion = false,
  isManuscriptContributor = false,
  categories,
  impact,
  openDiscussionTab,
  showTeamName = true,
  getEditManuscriptHref,
}) => {
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);

  const quickCheckDetails = quickCheckQuestions.filter(
    ({ field }) => version[`${field}Details`],
  );

  const getUpdatedByData = () => {
    if (
      version.updatedBy &&
      version.updatedBy.id &&
      version.updatedBy.teams &&
      version.updatedBy.teams.length
    ) {
      return {
        displayName: version.updatedBy.displayName,
        userHref: getUserHref(version.updatedBy.id),
        teams: getTeams(version.updatedBy.teams),
      };
    }
    return {
      displayName: version.createdBy.displayName,
      userHref: getUserHref(version.createdBy.id),
      teams: getTeams(version.createdBy.teams),
    };
  };

  const updatedByData = getUpdatedByData();

  const editManuscriptRoute = getEditManuscriptHref?.(manuscriptId);

  const handleEditManuscript = () => {
    if (editManuscriptRoute) {
      void navigate(editManuscriptRoute);
    }
  };

  const canEditManuscript = isActiveVersion && isManuscriptContributor;

  return (
    <>
      <div
        css={{
          borderBottom: `1px solid ${colors.steel.rgb}`,
          backgroundColor: colors.colour.neutral[0].rgb,
          ':first-of-type': {
            borderRadius: `${rem(8)} ${rem(8)} 0 0`,
          },
          ':last-of-type': {
            borderBottom: 'none',
            borderRadius: `0 0 ${rem(8)} ${rem(8)}`,
          },
        }}
      >
        {version.complianceReport && (
          <ComplianceReportCard
            {...version.complianceReport}
            count={version.count}
            manuscriptId={manuscriptId}
            versionId={version.id}
            showTeamName={showTeamName}
          />
        )}
        <div css={toastStyles}>
          <span css={toastHeaderStyles}>
            <span css={iconStyles}>
              <Button
                aria-label={expanded ? 'Collapse Version' : 'Expand Version'}
                linkStyle
                onClick={() => setExpanded(!expanded)}
              >
                <span>{expanded ? minusRectIcon : plusRectIcon}</span>
              </Button>
            </span>
            <span css={iconStyles}>{article}</span>
            <div css={titleContainerStyles}>
              <Subtitle noMargin>Manuscript #{version.count}</Subtitle>

              <div css={updatedByAndEditContainerStyles}>
                <Caption accent="lead" noMargin>
                  <div css={updatedByContainerStyles}>
                    <span css={updatedByTextStyles}>
                      Last Update:
                      <span>{formatDate(new Date(version.publishedAt))}</span>
                    </span>
                    <span css={updatedByTextStyles}>
                      Updated by:
                      <UserTeamInfo
                        displayName={updatedByData.displayName}
                        userHref={updatedByData.userHref}
                        teams={updatedByData.teams}
                        showTeamName={showTeamName}
                      />
                    </span>
                  </div>
                </Caption>
                {canEditManuscript && (
                  <Button
                    aria-label="Edit"
                    small
                    noMargin
                    onClick={handleEditManuscript}
                    overrideStyles={editIconStyles}
                  >
                    <PencilIcon />
                  </Button>
                )}
              </div>
            </div>
          </span>
          <div
            style={{
              display: 'flex',
              gap: rem(10),
              marginTop: rem(15),
              paddingLeft: rem(40),
            }}
          >
            <Pill accent="gray">{version.type}</Pill>
            <Pill accent="gray">{version.lifecycle}</Pill>
            <Pill accent="blue">{version.versionUID}</Pill>
          </div>
        </div>

        {expanded && (
          <div>
            <div css={[paddingStyles, toastContentStyles]}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: rem(12),
                  marginTop: rem(2),
                  marginBottom: rem(32),
                }}
              >
                <AssociationList
                  type="Team"
                  inline
                  associations={version.teams}
                />
                <AssociationList
                  type="Lab"
                  inline
                  associations={version.labs.map(({ name, id }) => ({
                    displayName: name,
                    id,
                  }))}
                />

                {impact && (
                  <AssociationList
                    type="Impact"
                    inline
                    associations={[
                      {
                        displayName: impact.name,
                        id: impact.id,
                      },
                    ]}
                  />
                )}

                {categories && categories.length > 0 && (
                  <AssociationList
                    type="Category"
                    inline
                    associations={categories.map(({ name, id }) => ({
                      displayName: name,
                      id,
                    }))}
                  />
                )}
              </div>
              <ExpandableText>{version.description}</ExpandableText>
              <div>
                <ManuscriptFileSection
                  filename={version.manuscriptFile.filename}
                  url={version.manuscriptFile.url}
                />
                {version.keyResourceTable && (
                  <ManuscriptFileSection
                    filename={version.keyResourceTable.filename}
                    url={version.keyResourceTable.url}
                  />
                )}
                {version.additionalFiles &&
                  version.additionalFiles.length > 0 &&
                  version.additionalFiles.map((additionalFile) => (
                    <ManuscriptFileSection
                      filename={additionalFile.filename}
                      url={additionalFile.url}
                      key={additionalFile.id}
                    />
                  ))}
                {version.complianceReportResponse && (
                  <ManuscriptFileSection
                    filename={version.complianceReportResponse.filename}
                    url={version.complianceReportResponse.url}
                  />
                )}
              </div>
              {quickCheckDetails.length > 0 && (
                <>
                  <span css={fileDividerStyles}>
                    <Divider />
                  </span>
                  <div css={quickCheckContainerStyles}>
                    {quickCheckDetails.map(({ field, question }) => (
                      <div css={quickCheckStyles} key={field}>
                        <Subtitle noMargin>{question}</Subtitle>
                        {version[field] && (
                          <Pill accent="gray" noMargin>
                            {version[field]}
                          </Pill>
                        )}
                        <span css={quickCheckDetailsStyles}>
                          {version[`${field}Details`]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button small noMargin onClick={openDiscussionTab} enabled>
                    Open Discussion Tab
                  </Button>
                </>
              )}
              {hasAdditionalInfo(version) && (
                <div>
                  <span
                    css={
                      quickCheckDetails.length
                        ? dividerStyles
                        : fileDividerStyles
                    }
                  >
                    <Divider />
                  </span>
                  <span
                    css={{
                      fontStyle: 'italic',
                      marginBottom: rem(12),
                      display: 'block',
                    }}
                  >
                    <Subtitle>Additional Information</Subtitle>
                  </span>

                  <ol css={additionalInformationListStyles}>
                    {version.preprintDoi && (
                      <li css={additionalInformationEntryStyles}>
                        <strong>Preprint DOI</strong>
                        <span css={additionalInformationValueStyles}>
                          <Link
                            href={new URL(
                              `https://doi.org/${version.preprintDoi}`,
                            ).toString()}
                          >
                            {version.preprintDoi}
                          </Link>
                        </span>
                      </li>
                    )}

                    {version.publicationDoi && (
                      <>
                        {version.preprintDoi && <Divider />}
                        <li css={additionalInformationEntryStyles}>
                          <strong>Publication DOI</strong>
                          <span css={additionalInformationValueStyles}>
                            <Link
                              href={new URL(
                                `https://doi.org/${version.publicationDoi}`,
                              ).toString()}
                            >
                              {version.publicationDoi}
                            </Link>
                          </span>
                        </li>
                      </>
                    )}
                    {version.otherDetails && (
                      <>
                        {(version.preprintDoi || version.publicationDoi) && (
                          <Divider />
                        )}
                        <li css={additionalInformationEntryStyles}>
                          <strong>Other details</strong>
                          <span css={additionalInformationValueStyles}>
                            {version.otherDetails}
                          </span>
                        </li>
                      </>
                    )}
                  </ol>
                </div>
              )}
              <Caption accent="lead" noMargin>
                <div css={userContainerStyles}>
                  Date created:
                  <span>{formatDate(new Date(version.createdDate))}</span>
                  <span> • </span>
                  Created by:
                  <UserTeamInfo
                    displayName={version.createdBy.displayName}
                    userHref={getUserHref(version.createdBy.id)}
                    teams={getTeams(version.createdBy.teams)}
                    showTeamName={showTeamName}
                  />
                </div>
              </Caption>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ManuscriptVersionCard;
