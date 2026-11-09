import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';
import { useUserProfileContext } from '@asap-hub/react-context';

import { Card, Headline2, Headline3, Link, Pill } from '../atoms';
import { colour } from '../colors';
import { CircleInfoIcon, ExternalLinkIcon, OrcidIcon } from '../icons';
import { mailToSupport } from '../mail';
import { LinkHeadline } from '../molecules';
import { mobileScreen, rem } from '../pixels';
import {
  bodyTextStyles,
  cardContentStyles,
  cardHeaderStyles,
  emptyStateTextStyles,
} from './shared-user-profile-card-styles';
import { formatOrcidPublicationDate, orcidWorkTypeLabels } from './orcid-works';

const worksHeaderStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

const viaOrcidStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  margin: 0,
  fontWeight: 600,
  color: colour.foreground.primary,
  whiteSpace: 'nowrap',
  svg: { width: rem(20), height: rem(20) },
});

const orcidNoticeStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(12),
  padding: rem(16),
  borderRadius: rem(8),
  backgroundColor: colour.background.tertiary,
});

const orcidNoticeTextStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const orcidNumberStyles = css({
  margin: 0,
  fontWeight: 500,
  color: colour.foreground.neutral,
});

const orcidContactStyles = css({
  margin: 0,
  fontSize: rem(14),
  color: colour.foreground.secondary,
  a: { fontWeight: 600 },
  svg: { width: rem(23), height: rem(23), verticalAlign: rem(-5.5) },
});

const workListStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  margin: 0,
  padding: 0,
  listStyle: 'none',
  'li + li': {
    paddingTop: rem(24),
    borderTop: `1px solid ${colour.border.tertiary}`,
  },
});

const workStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(12),
});

const footnoteStyles = css({
  margin: 0,
  paddingTop: rem(24),
  borderTop: `1px solid ${colour.border.tertiary}`,
  color: colour.foreground.quaternary,
});

type Props = Pick<UserResponse, 'orcid' | 'orcidWorks'>;

const UserProfileRecentWorksNew: React.FC<Props> = ({
  orcid,
  orcidWorks = [],
}) => {
  const { isOwnProfile } = useUserProfileContext();

  return (
    <Card padding={false} title="Recent Publications">
      <div css={cardContentStyles}>
        <div css={[cardHeaderStyles, worksHeaderStyles]}>
          <Headline2 styleAsHeading={3} noMargin>
            Recent Publications ({orcidWorks.length})
          </Headline2>
          <p css={viaOrcidStyles}>
            Via ORCID
            <OrcidIcon color={colour.foreground.primary} />
          </p>
        </div>
        {isOwnProfile && orcid && (
          <div css={orcidNoticeStyles}>
            <CircleInfoIcon size={24} />
            <div css={orcidNoticeTextStyles}>
              <p css={orcidNumberStyles}>Your ORCID is: {orcid}</p>
              <p css={orcidContactStyles}>
                If this is incorrect please{' '}
                <Link
                  href={mailToSupport({ subject: 'Orcid change request' })}
                  applyIconTheme
                >
                  contact ASAP <ExternalLinkIcon />
                </Link>
              </p>
            </div>
          </div>
        )}
        {orcidWorks.length ? (
          <ul css={workListStyles}>
            {orcidWorks.map(({ id, doi, title, type, publicationDate }) => {
              const publishedDate = formatOrcidPublicationDate(publicationDate);
              return (
                <li key={id} css={workStyles}>
                  <Pill noMargin>{orcidWorkTypeLabels[type]}</Pill>
                  {doi ? (
                    <LinkHeadline
                      level={3}
                      styleAsHeading={4}
                      noMargin
                      href={doi}
                    >
                      {title}
                    </LinkHeadline>
                  ) : (
                    <Headline3 styleAsHeading={4} noMargin>
                      {title}
                    </Headline3>
                  )}
                  {publishedDate && (
                    <p css={bodyTextStyles}>
                      Originally Published: {publishedDate}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p css={emptyStateTextStyles}>No publications yet.</p>
        )}
        <p css={footnoteStyles}>
          Works are automatically pulled via ORCID and may take up to 24 hours
          to appear here.
        </p>
      </div>
    </Card>
  );
};

export default UserProfileRecentWorksNew;
