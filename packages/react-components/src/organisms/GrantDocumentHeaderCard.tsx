import {
  GrantType,
  ProjectDataObject,
  ResearchOutputResponse,
} from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Card, Display, Pill } from '../atoms';
import { colour } from '../colors';
import { formatDate } from '../date';
import { TeamIcon } from '../icons';
import { AssociationRow, ExternalLink } from '../molecules';
import { mobileScreen, rem } from '../pixels';
import { getProjectConfig, titleCase } from '../utils';

const cardStyles = css({
  backgroundColor: colour.background.secondary,
});

const metadataStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  columnGap: rem(12),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    alignItems: 'flex-start',
  },
});

const labelsStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(8),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

const labelGroupStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(8),
});

// rem() emits em, so box sizes stay on the parent and the 14px text on a child
const smallTextStyles = {
  fontSize: rem(14),
  lineHeight: 16 / 14,
};

const labelStyles = css({
  '& > span': {
    padding: `0 ${rem(7)}`,
    borderColor: colour.border.secondary,
    borderRadius: rem(4),
  },
  '& small': smallTextStyles,
});

const HeaderLabel: React.FC<{ children: string }> = ({ children }) => (
  <span css={labelStyles}>
    <Pill noMargin>{children}</Pill>
  </span>
);

const accessOutputStyles = css({
  '& > div': {
    height: rem(32),
  },
  '& a > span': {
    flexDirection: 'row-reverse',
    columnGap: rem(8),
    height: rem(32),
    padding: `${rem(3)} ${rem(7)} ${rem(3)} ${rem(15)}`,
    borderRadius: rem(4),
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      padding: rem(3),
    },
  },
  '& a > span > span': {
    paddingTop: 0,
  },
});

const titleStyles = css({
  marginTop: rem(16),
  '& > h1': {
    margin: 0,
  },
});

const associationsStyles = css({
  display: 'flex',
  flexDirection: 'column',
  rowGap: rem(16),
  marginTop: rem(16),
});

const datesStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: rem(12),
  rowGap: rem(8),
  marginTop: rem(32),
  color: colour.foreground.quaternary,
  '& > span': smallTextStyles,
});

const desktopOnlyStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    display: 'none',
  },
});

type GrantDocumentHeaderCardProps = Pick<
  ResearchOutputResponse,
  | 'title'
  | 'documentType'
  | 'link'
  | 'teams'
  | 'addedDate'
  | 'created'
  | 'lastUpdatedPartial'
> & {
  grantType: GrantType;
  project: Pick<ProjectDataObject, 'id' | 'title' | 'projectType'>;
};

const GrantDocumentHeaderCard: React.FC<GrantDocumentHeaderCardProps> = ({
  title,
  documentType,
  link,
  teams,
  addedDate,
  created,
  lastUpdatedPartial,
  grantType,
  project,
}) => {
  const { href: projectHref, icon: projectIcon } = getProjectConfig({
    projectId: project.id,
    projectType: project.projectType,
  });
  return (
    <Card overrideStyles={cardStyles}>
      <div css={metadataStyles}>
        <div css={labelsStyles}>
          <HeaderLabel>Project Output</HeaderLabel>
          <div css={labelGroupStyles}>
            <HeaderLabel>{documentType}</HeaderLabel>
            <HeaderLabel>{titleCase(grantType)}</HeaderLabel>
          </div>
        </div>
        {link && (
          <div css={accessOutputStyles}>
            <ExternalLink
              href={link}
              label="Access Output"
              size="large"
              noMargin
            />
          </div>
        )}
      </div>
      <div css={titleStyles}>
        <Display styleAsHeading={3}>{title}</Display>
      </div>
      <div css={associationsStyles}>
        <AssociationRow
          icon={projectIcon}
          max={1}
          label="Projects"
          items={[
            { id: project.id, displayName: project.title, href: projectHref },
          ]}
        />
        {teams.length > 0 && (
          <AssociationRow
            icon={<TeamIcon />}
            max={3}
            label="Teams"
            separator="•"
            items={teams.map(({ id, displayName }) => ({
              id,
              displayName: `Team ${displayName}`,
              href: network({}).teams({}).team({ teamId: id }).$,
            }))}
          />
        )}
      </div>
      <div css={datesStyles}>
        <span>Date Added: {formatDate(new Date(addedDate || created))}</span>
        <span css={desktopOnlyStyles}>•</span>
        <span css={desktopOnlyStyles}>
          Last updated: {formatDate(new Date(lastUpdatedPartial))}
        </span>
      </div>
    </Card>
  );
};

export default GrantDocumentHeaderCard;
