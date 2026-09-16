import { getLatestUserAward, UserResponse } from '@asap-hub/model';
import { UserProfileContext, useFlags } from '@asap-hub/react-context';
import { dashboard, network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useCallback, useContext } from 'react';
import {
  Anchor,
  Avatar,
  Display,
  Link,
  TabLink,
  StateTag,
  CopyButton,
  Spinner,
} from '../atoms';
import { paper, tin } from '../colors';
import { editIcon, uploadIcon, alumniBadgeIcon } from '../icons';
import { createMailTo } from '../mail';
import {
  Breadcrumbs,
  SocialIcons,
  TabNav,
  UserProfilePersonalText,
} from '../molecules';
import { badgeImageStyles } from '../molecules/AvatarWithBadge';
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
  position: 'relative',
  // keep the badge's z-index scoped here so it can't float over the nav drawer
  isolation: 'isolate',
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
const avatarStyles = css({
  width: rem(avatarSize),
  height: rem(avatarSize),
  margin: 0,
});
const uploadOverlayStyles = css({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  cursor: 'pointer',
  opacity: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  transition: 'opacity 150ms ease-in-out',
  ':hover, :focus-within': {
    opacity: 1,
  },
});

const savingOverlayStyles = css({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
});
const badgeSize = 48;
const badgeStyles = css({
  position: 'absolute',
  right: rem(-10),
  bottom: rem(-8),
  display: 'inline-flex',
  width: rem(badgeSize),
  height: rem(badgeSize),
  // above the hover/upload and saving overlays; scoped by the container's
  // isolate so it does not escape over page-level layers like the nav drawer
  zIndex: 1,
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
  const { isEnabled } = useFlags();
  const latestAward = isEnabled('STAGING_MODE')
    ? getLatestUserAward(teams)
    : undefined;

  const scrollHandler = useCallback(() => {
    // scroll imperatively too: re-clicking when the hash is
    // already #badges is a no-op for the router, so the
    // hash-based scroll would not fire on the second click
    document.getElementById(badgesAnchorId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

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
                        <div css={{ color: tin.rgb }}>
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
                <Avatar
                  imageUrl={avatarUrl}
                  firstName={firstName}
                  lastName={lastName}
                  overrideStyles={avatarStyles}
                />
                {latestAward?.iconUrl && (
                  <span css={badgeStyles}>
                    <Anchor
                      href={`${tabRoutes.research({}).$}#${badgesAnchorId}`}
                      aria-label={`${latestAward.name} badge`}
                      onClick={scrollHandler}
                    >
                      <img
                        css={badgeImageStyles}
                        src={latestAward.iconUrl}
                        alt=""
                      />
                    </Anchor>
                  </span>
                )}
                {onImageSelect &&
                  (avatarSaving ? (
                    <div css={savingOverlayStyles}>
                      <Spinner
                        size={24}
                        color={paper.rgb}
                        trackColor="rgba(255, 255, 255, 0.4)"
                        ariaLabel="Saving avatar"
                        ariaBusy
                      />
                    </div>
                  ) : (
                    <label css={uploadOverlayStyles} aria-label="Edit Avatar">
                      {uploadIcon}
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        aria-label="Upload Avatar"
                        onChange={(event) =>
                          event.target.files?.length &&
                          event.target.files[0] &&
                          onImageSelect(event.target.files[0])
                        }
                        css={{ display: 'none' }}
                      />
                    </label>
                  ))}
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
