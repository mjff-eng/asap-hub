import { getLatestUserAward, UserResponse } from '@asap-hub/model';
import { UserProfileContext } from '@asap-hub/react-context';
import { dashboard, network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useContext } from 'react';

import { CopyButton, Display, Link, StateTag, TabLink } from '../atoms';
import { colour } from '../colors';
import { formatDateToTimezone } from '../date';
import {
  alumniBadgeIcon,
  editSquareIcon,
  mailIcon,
  MapPinIcon,
  MessageAlertIcon,
} from '../icons';
import { createMailTo } from '../mail';
import {
  Breadcrumbs,
  ExternalProfiles,
  TabNav,
  UserProfileAvatar,
  UserProfilePersonalText,
} from '../molecules';
import { Toast } from '../organisms';
import { badgesAnchorId } from '../organisms/UserProfileBadges';
import { rem, tabletScreen } from '../pixels';
import { captionRegularStyles } from '../text';
import PageInfoContainer from './PageInfoContainer';

const desktopQuery = `@media (min-width: ${tabletScreen.min}px)`;

const AVATAR_SIZE = 96;
const AVATAR_SIZE_DESKTOP = 120;
const LOCATION_ICON_SIZE = 20;

const noTeamAffiliationTooltip = {
  icon: <MessageAlertIcon />,
  width: 296,
  background: colour.foreground.secondary,
  overrideTooltipStyles: css(captionRegularStyles, {
    textAlign: 'center',
    background: colour.foreground.secondary,
    paddingTop: rem(3),
    paddingBottom: rem(3),
  }),
};

const gapAbove = (mobile: number, desktop: number = 0) =>
  css({
    marginTop: rem(mobile),
    [desktopQuery]: { marginTop: rem(desktop) },
  });

const containerStyles = css({
  display: 'grid',
  rowGap: 0,
  columnGap: rem(12),
  alignItems: 'start',
  grid: `
    "avatar       avatar      " auto
    "name         name        " auto
    "edit-profile edit-profile" auto
    "personal     personal    " auto
    "social       social      " auto
    "contact      contact     " auto
    "copy         edit-contact" auto
      / max-content 1fr
  `,

  [desktopQuery]: {
    columnGap: rem(12),
    grid: `
      "avatar name     name  edit-profile" auto
      "avatar personal personal .       " auto
      "avatar social   social   .       " auto
      "avatar contact  copy     edit-contact" auto
        / max-content max-content 1fr max-content
    `,
  },
});

const avatarSizeStyles = css({
  [desktopQuery]: {
    width: rem(AVATAR_SIZE_DESKTOP),
    height: rem(AVATAR_SIZE_DESKTOP),
  },
});

const avatarStyles = css({
  gridArea: 'avatar',
  [desktopQuery]: {
    marginRight: rem(20),
  },
});

const nameStyles = css(gapAbove(32), {
  gridArea: 'name',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: rem(12),
  rowGap: rem(8),
});

const degreeStyles = css({
  whiteSpace: 'nowrap',
});

const degreePlaceholderStyles = css({
  color: colour.foreground.disabled,
});

const editButtonStyles = css({
  justifySelf: 'start',
  'a > svg': {
    height: rem(20),
    paddingTop: rem(2),
    paddingBottom: rem(2),
  },
  [desktopQuery]: {
    justifySelf: 'end',
  },
});

const editProfileStyles = css(gapAbove(24), {
  gridArea: 'edit-profile',
});

const personalStyles = css(gapAbove(24, 24), {
  gridArea: 'personal',
});

const socialStyles = css(gapAbove(16, 16), {
  gridArea: 'social',
});

const contactStyles = css(gapAbove(32, 24), {
  gridArea: 'contact',
  display: 'flex',
  '> a': { flexGrow: 1 },
});

const copyStyles = css(gapAbove(8, 24), {
  gridArea: 'copy',
  display: 'flex',
  alignItems: 'center',
});

const editContactStyles = css(gapAbove(8, 24), {
  gridArea: 'edit-contact',
});

type UserProfileHeaderNewProps = Pick<
  UserResponse,
  | 'id'
  | 'lastModifiedDate'
  | 'alumniSinceDate'
  | 'alumniLastUpdated'
  | 'alumniLocation'
  | 'avatarUrl'
  | 'contactEmail'
  | 'email'
  | 'fullDisplayName'
  | 'firstName'
  | 'institution'
  | 'jobTitle'
  | 'lastName'
  | 'country'
  | 'stateOrProvince'
  | 'city'
  | 'role'
  | 'social'
  | 'teams'
  | 'degree'
  | 'labs'
> & {
  readonly onImageSelect?: (file: File) => void;
  readonly avatarSaving?: boolean;

  readonly editPersonalInfoHref?: string;
  readonly editContactInfoHref?: string;
  readonly sharedOutputsCount?: number;
  readonly upcomingEventsCount?: number;
  readonly pastEventsCount?: number;
};

const UserProfileHeaderNew: React.FC<UserProfileHeaderNewProps> = ({
  id,
  lastModifiedDate,
  alumniSinceDate,
  alumniLastUpdated,
  alumniLocation,
  fullDisplayName,
  country,
  stateOrProvince,
  city,
  institution,
  firstName,
  lastName,
  teams,
  jobTitle,
  avatarUrl,
  contactEmail,
  email,
  degree,
  onImageSelect,
  avatarSaving,
  labs,
  editPersonalInfoHref,
  editContactInfoHref,
  role: _role,
  social,
  sharedOutputsCount,
  upcomingEventsCount,
  pastEventsCount,
}) => {
  const tabRoutes = network({}).users({}).user({ userId: id });
  const { isOwnProfile } = useContext(UserProfileContext);
  const latestAward = getLatestUserAward(teams);
  const isAlumni = !!alumniSinceDate;

  return (
    <>
      {alumniSinceDate && (
        <Toast accent="warning">
          Records indicate the individual transitioned to alumni status on{' '}
          <strong>
            {formatDateToTimezone(alumniSinceDate, 'do MMMM yyyy')}
          </strong>
          {alumniLocation && (
            <span>
              , with their final affiliation noted at{' '}
              <strong>{alumniLocation}</strong>
            </span>
          )}
          . Because this individual can not access the Hub, current details may
          not be up to date. The profile was last modified on{' '}
          <strong>
            {formatDateToTimezone(
              alumniLastUpdated || lastModifiedDate,
              'do MMMM yyyy',
            )}
          </strong>
          .
        </Toast>
      )}
      <header>
        <PageInfoContainer
          breadcrumbs={
            <Breadcrumbs
              homeHref={dashboard({}).$}
              items={[
                { label: 'People', href: network({}).users({}).$ },
                { label: fullDisplayName },
              ]}
            />
          }
          nav={
            <TabNav>
              <TabLink href={tabRoutes.research({}).$}>Overview</TabLink>
              <TabLink href={tabRoutes.about({}).$}>Memberships</TabLink>
              <TabLink href={tabRoutes.outputs({}).$}>
                Outputs
                {sharedOutputsCount !== undefined && ` (${sharedOutputsCount})`}
              </TabLink>
              {!isAlumni && (
                <TabLink href={tabRoutes.upcoming({}).$}>
                  Upcoming Events
                  {upcomingEventsCount !== undefined &&
                    ` (${upcomingEventsCount})`}
                </TabLink>
              )}
              <TabLink href={tabRoutes.past({}).$}>
                Past Events
                {pastEventsCount !== undefined && ` (${pastEventsCount})`}
              </TabLink>
            </TabNav>
          }
        >
          <div css={containerStyles}>
            <div css={avatarStyles}>
              <UserProfileAvatar
                avatarUrl={avatarUrl}
                firstName={firstName}
                lastName={lastName}
                size={AVATAR_SIZE}
                overrideStyles={avatarSizeStyles}
                badge={
                  latestAward?.iconUrl
                    ? {
                        name: latestAward.name,
                        iconUrl: latestAward.iconUrl,
                        href: `${tabRoutes.research({}).$}#${badgesAnchorId}`,
                      }
                    : undefined
                }
                onImageSelect={onImageSelect}
                avatarSaving={avatarSaving}
              />
            </div>

            <div css={nameStyles}>
              <Display styleAsHeading={2} noMargin>
                {fullDisplayName}
                {degree ? (
                  <span css={degreeStyles}>, {degree}</span>
                ) : isOwnProfile ? (
                  <span css={[degreeStyles, degreePlaceholderStyles]}>
                    , Degree
                  </span>
                ) : null}
              </Display>
              {isAlumni && <StateTag icon={alumniBadgeIcon} label="Alumni" />}
            </div>

            {editPersonalInfoHref && (
              <div css={[editButtonStyles, editProfileStyles]}>
                <Link buttonStyle small noMargin href={editPersonalInfoHref}>
                  {editSquareIcon}
                  Edit profile
                </Link>
              </div>
            )}

            <div css={personalStyles}>
              <UserProfilePersonalText
                institution={institution}
                country={country}
                stateOrProvince={stateOrProvince}
                city={city}
                jobTitle={jobTitle}
                teams={teams}
                labs={labs}
                isAlumni={isAlumni}
                variant="compact"
                noTeamAffiliationTooltip={noTeamAffiliationTooltip}
                locationIcon={
                  <MapPinIcon
                    size={LOCATION_ICON_SIZE}
                    color={colour.foreground.tertiary}
                  />
                }
              />
            </div>

            {!isAlumni && (
              <>
                {social && (
                  <div css={socialStyles}>
                    <ExternalProfiles {...social} />
                  </div>
                )}
                <div css={contactStyles}>
                  <Link
                    buttonStyle
                    small
                    primary
                    noMargin
                    href={createMailTo(contactEmail || email)}
                  >
                    {`Contact ${firstName}`}
                    {mailIcon}
                  </Link>
                </div>
                <div css={copyStyles}>
                  <CopyButton
                    hoverTooltipText="Copy Email"
                    clickTooltipText="Email Copied"
                    onClick={() => navigator.clipboard.writeText(email)}
                  />
                </div>
                {editContactInfoHref && (
                  <div css={[editButtonStyles, editContactStyles]}>
                    <Link buttonStyle small noMargin href={editContactInfoHref}>
                      {editSquareIcon}
                      Edit contact
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </PageInfoContainer>
      </header>
    </>
  );
};

export default UserProfileHeaderNew;
