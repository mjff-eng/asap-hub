import { getLatestUserAward, UserResponse } from '@asap-hub/model';
import { UserProfileContext } from '@asap-hub/react-context';
import { dashboard, network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useContext } from 'react';
import { Display, Link, TabLink, StateTag, CopyButton } from '../atoms';
import { colour } from '../colors';
import { editIcon, alumniBadgeIcon } from '../icons';
import { createMailTo } from '../mail';
import {
  Breadcrumbs,
  SocialIcons,
  TabNav,
  UserProfileAvatar,
  UserProfilePersonalText,
} from '../molecules';
import { Toast } from '../organisms';
import { badgesAnchorId } from '../organisms/UserProfileBadges';
import {
  largeDesktopScreen,
  mobileScreen,
  rem,
  vminLinearCalc,
  smallDesktopScreen,
} from '../pixels';
import { formatDateToTimezone } from '../date';
import PageInfoContainer from './PageInfoContainer';

const middleSizeQuery = '@media (min-width: 620px)';
const bigSizeQuery = `@media (min-width: ${smallDesktopScreen.width}px)`;

const containerStyles = css({
  display: 'grid',
  grid: `
    "avatar       avatar            " auto
    ".            edit-personal-info" ${rem(24)}
    "personal-info personal-info    " auto
    "contact      edit-contact-info " auto
    "social       social            " auto
      / 1fr ${rem(36)}
  `,
  gridColumnGap: rem(12),

  [middleSizeQuery]: {
    grid: `
      ".             .             edit-personal-info avatar" ${rem(24)}
      "personal-info personal-info personal-info      avatar" auto
      "contact       social        edit-contact-info  avatar" auto
        / max-content 1fr ${rem(36)} max-content
    `,
  },

  [bigSizeQuery]: {
    grid: `
      "edit-personal-info personal-info personal-info avatar"
      "edit-contact-info  contact       social        avatar"
        / ${rem(36)} max-content 1fr max-content
    `,
    gridColumnGap: vminLinearCalc(
      mobileScreen,
      24,
      largeDesktopScreen,
      30,
      'px',
    ),
  },
});

const nameHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(6),
});

const editPersonalInfoStyles = css({
  gridArea: 'edit-personal-info',
  justifySelf: 'end',
  transform: 'translateX(2px)',
});

const personalInfoStyles = css({
  gridArea: 'personal-info',

  display: 'flex',
  flexDirection: 'column',

  justifyContent: 'space-between',
  alignItems: 'start',
});

const editContactStyles = css({
  gridArea: 'edit-contact-info',
  transform: 'translateX(2px)',
});
const contactStyles = css({
  gridArea: 'contact',

  [middleSizeQuery]: {
    justifySelf: 'start',
    gridTemplateColumns: 'min-content min-content',
  },

  display: 'grid',
  gridTemplateColumns: 'auto min-content',
  alignItems: 'start',
});
const contactNoEditStyles = css({
  gridColumnEnd: 'edit-contact-info',
  [middleSizeQuery]: {
    gridColumnEnd: 'contact',
  },
});

const socialIconStyles = css({
  gridArea: 'social',
});

const avatarSize = 128;

const avatarContainer = css({
  gridArea: 'avatar',
  width: rem(avatarSize),
  height: rem(avatarSize),
  justifySelf: 'start',

  [middleSizeQuery]: {
    justifySelf: 'end',
  },

  // counteract the relativeAnchor left shift so the avatar stays flush right
  [bigSizeQuery]: {
    transform: `translateX(${rem(64)})`,
  },
});

type UserProfileHeaderProps = Pick<
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

// TODO: Temporary hack to accommodate the component until ASAP-1233 is done
const relativeAnchor = css({
  position: 'relative',
  left: 0,
  [bigSizeQuery]: {
    left: rem(-64),
  },
});

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
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
              <TabLink href={tabRoutes.research({}).$}>Research</TabLink>
              <TabLink href={tabRoutes.about({}).$}>Background</TabLink>
              <TabLink href={tabRoutes.outputs({}).$}>
                Shared Outputs
                {sharedOutputsCount !== undefined && ` (${sharedOutputsCount})`}
              </TabLink>
              <TabLink href={tabRoutes.upcoming({}).$}>
                Upcoming Events
                {upcomingEventsCount !== undefined &&
                  ` (${upcomingEventsCount})`}
              </TabLink>

              <TabLink href={tabRoutes.past({}).$}>
                Past Events
                {pastEventsCount !== undefined && ` (${pastEventsCount})`}
              </TabLink>
            </TabNav>
          }
        >
          <div css={relativeAnchor}>
            <div css={containerStyles}>
              <section css={personalInfoStyles}>
                <div>
                  <div css={nameHeaderStyles}>
                    <div css={{ display: 'flex' }}>
                      <Display styleAsHeading={2}>{fullDisplayName}</Display>
                      {degree ? (
                        <Display styleAsHeading={2}>, {degree}</Display>
                      ) : isOwnProfile ? (
                        <div css={{ color: colour.foreground.disabled }}>
                          <Display styleAsHeading={2}>, Degree</Display>
                        </div>
                      ) : null}
                    </div>
                    {alumniSinceDate && (
                      <StateTag icon={alumniBadgeIcon} label="Alumni" />
                    )}
                  </div>
                  <UserProfilePersonalText
                    institution={institution}
                    country={country}
                    stateOrProvince={stateOrProvince}
                    city={city}
                    jobTitle={jobTitle}
                    teams={teams}
                    labs={labs}
                    isAlumni={!!alumniSinceDate}
                  />
                </div>
              </section>
              <div css={avatarContainer}>
                <UserProfileAvatar
                  avatarUrl={avatarUrl}
                  firstName={firstName}
                  lastName={lastName}
                  size={avatarSize}
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
              {editPersonalInfoHref && (
                <div css={editPersonalInfoStyles}>
                  <Link
                    buttonStyle
                    small
                    primary
                    href={editPersonalInfoHref}
                    label="Edit personal information"
                  >
                    {editIcon}
                  </Link>
                </div>
              )}
              <section
                css={[
                  contactStyles,
                  editContactInfoHref ? null : contactNoEditStyles,
                ]}
              >
                <Link
                  small
                  buttonStyle
                  primary
                  href={createMailTo(contactEmail || email)}
                >
                  Contact
                </Link>
                <div
                  css={{
                    margin: `${rem(12)} ${rem(8)}`,
                  }}
                >
                  <CopyButton
                    hoverTooltipText="Copy Email"
                    clickTooltipText="Email Copied"
                    onClick={() => navigator.clipboard.writeText(email)}
                  />
                </div>
              </section>

              {editContactInfoHref && (
                <div css={editContactStyles}>
                  <Link
                    buttonStyle
                    small
                    primary
                    href={editContactInfoHref}
                    label="Edit contact information"
                  >
                    {editIcon}
                  </Link>
                </div>
              )}
              <div css={socialIconStyles}>
                <SocialIcons {...social} />
              </div>
            </div>
          </div>
        </PageInfoContainer>
      </header>
    </>
  );
};

export default UserProfileHeader;
