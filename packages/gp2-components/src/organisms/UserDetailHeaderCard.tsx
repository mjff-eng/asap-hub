import { gp2 as gp2Model } from '@asap-hub/model';
import {
  alumniBadgeIcon,
  Avatar,
  formatDate,
  formatUserLocation,
  Headline3,
  Link,
  pixels,
  StateTag,
  Toast,
  uploadIcon,
  colour,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { addIcon, editIcon, locationIcon, roleIcon } from '../icons';
import { usersHeaderImage } from '../images';
import { mobileQuery, nonMobileQuery } from '../layout';
import { SocialIcons } from '../molecules';
import CardWithBackground from '../molecules/CardWithBackground';
import IconWithLabel from '../molecules/IconWithLabel';
import UserRegion from '../molecules/UserRegion';

const { rem } = pixels;

type UserDetailHeaderCardProps = Pick<
  gp2Model.UserResponse,
  | 'id'
  | 'fullDisplayName'
  | 'firstName'
  | 'lastName'
  | 'avatarUrl'
  | 'degrees'
  | 'region'
  | 'role'
  | 'city'
  | 'stateOrProvince'
  | 'country'
  | 'positions'
  | 'social'
  | 'alumniSinceDate'
  | 'alumniLastUpdated'
  | 'alumniLocation'
  | 'lastModifiedDate'
> & {
  editHref?: string;
  readonly onImageSelect?: (file: File) => void;
  readonly avatarSaving?: boolean;
};

const avatarSize = 132;

const containerStyles = css({
  display: 'grid',
  grid: `
    "avatar headline edit" max-content
    "avatar details details" auto
    /min-content auto min-content
    `,
  columnGap: rem(32),
  rowGap: rem(12),
  [mobileQuery]: {
    grid: `
    "edit" auto
    "avatar" ${rem(avatarSize)}
    "headline" auto
    "details" auto`,
  },
});

const avatarStyles = css({
  width: rem(avatarSize),
  height: rem(avatarSize),
  margin: 0,
  [mobileQuery]: {
    margin: 'auto',
  },
});
const rowStyles = css({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  [nonMobileQuery]: {
    flexDirection: 'row',
    gap: rem(24),
  },
});
const rowContainerStyles = css({
  marginBottom: rem(12),
});
const editButtonStyles = css({
  [nonMobileQuery]: {
    marginLeft: 'auto',
  },
});
const addIconStyles = css({
  display: 'flex',
  'svg > path': { fill: 'white' },
});

const validateCompleted = ({
  firstName,
  lastName,
  degrees,
  region,
  country,
  stateOrProvince,
  city,
  positions,
  role,
}: Pick<
  UserDetailHeaderCardProps,
  | 'firstName'
  | 'lastName'
  | 'degrees'
  | 'region'
  | 'role'
  | 'country'
  | 'stateOrProvince'
  | 'city'
  | 'positions'
>) =>
  firstName &&
  lastName &&
  degrees?.length &&
  region &&
  country &&
  stateOrProvince &&
  city &&
  positions.length &&
  role;

const UserDetailHeaderCard: React.FC<UserDetailHeaderCardProps> = ({
  fullDisplayName,
  avatarUrl,
  degrees,
  firstName,
  lastName,
  region,
  role,
  city,
  stateOrProvince,
  country,
  positions,
  social,
  alumniSinceDate,
  alumniLastUpdated,
  alumniLocation,
  lastModifiedDate,
  editHref,
  onImageSelect,
  avatarSaving = false,
}) => {
  const completed = validateCompleted({
    degrees,
    firstName,
    lastName,
    region,
    role,
    country,
    stateOrProvince,
    city,
    positions,
  });

  return (
    <>
      {alumniSinceDate && (
        <div>
          <Toast accent="warning" rounded>
            Records indicate the individual transitioned to alumni status on{' '}
            <strong>{formatDate(new Date(alumniSinceDate))}</strong>
            {alumniLocation && (
              <>
                , with their final affiliation noted at{' '}
                <strong>{alumniLocation}</strong>
              </>
            )}
            . Because this individual can not access the Hub, current details
            may not be up to date. The profile was last modified on{' '}
            <strong>
              {formatDate(new Date(alumniLastUpdated || lastModifiedDate))}
            </strong>
            .
          </Toast>
        </div>
      )}
      <CardWithBackground image={usersHeaderImage}>
        <div css={containerStyles}>
          <div
            css={css({
              gridArea: 'avatar',
              display: 'grid',
              width: rem(avatarSize),
              height: rem(avatarSize),
            })}
          >
            <div css={css({ gridRow: 1, gridColumn: 1 })}>
              <Avatar
                imageUrl={avatarUrl}
                firstName={firstName}
                lastName={lastName}
                overrideStyles={avatarStyles}
              />
            </div>
            <div
              css={css({
                gridRow: 1,
                gridColumn: 1,
                alignSelf: 'flex-end',
                justifySelf: 'flex-end',
              })}
            >
              {onImageSelect && (
                <label>
                  <Link
                    small
                    buttonStyle
                    noMargin
                    href={undefined}
                    label="Edit Avatar"
                    enabled={!avatarSaving}
                  >
                    <span
                      css={css({
                        display: 'flex',
                        margin: `${rem(3)} 0`,
                        svg: {
                          stroke: colour.foreground.tertiary,
                        },
                      })}
                    >
                      {uploadIcon}
                    </span>
                    <input
                      disabled={avatarSaving}
                      type="file"
                      accept="image/x-png,image/jpeg"
                      aria-label="Upload Avatar"
                      onChange={(event) =>
                        event.target.files?.length &&
                        event.target.files[0] &&
                        onImageSelect(event.target.files[0])
                      }
                      css={{ display: 'none' }}
                    />
                  </Link>
                </label>
              )}
            </div>
          </div>

          <div css={[{ gridArea: 'headline', overflowWrap: 'anywhere' }]}>
            <div
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: rem(8),
                flexWrap: 'wrap',
              }}
            >
              <Headline3 noMargin>
                {fullDisplayName}
                {degrees && !!degrees.length && `, ${degrees.join(', ')}`}
              </Headline3>
              {alumniSinceDate && (
                <StateTag icon={alumniBadgeIcon} label="Alumni" />
              )}
            </div>
          </div>
          <div css={[rowContainerStyles, { gridArea: 'details' }]}>
            <div css={rowStyles}>
              <IconWithLabel icon={roleIcon}>{role}</IconWithLabel>
              <UserRegion region={region} />
            </div>
            <div css={rowContainerStyles}>
              <IconWithLabel icon={locationIcon}>
                <span>
                  {formatUserLocation(city, stateOrProvince, country)}
                </span>
              </IconWithLabel>
            </div>
            {positions.map(
              ({ role: positionRole, department, institution }, idx) => (
                <div css={rowContainerStyles} key={`position-${idx}`}>
                  {positionRole} in {department} at {institution}
                </div>
              ),
            )}
            <SocialIcons {...social} />
          </div>
          {editHref && (
            <div css={[{ gridArea: 'edit' }, editButtonStyles]}>
              <Link
                href={editHref}
                buttonStyle
                {...(completed ? {} : { primary: true })}
                noMargin
                small
                fullWidth
              >
                <span
                  css={{
                    display: 'inline-flex',
                    gap: rem(8),
                    marginLeft: rem(6),
                  }}
                >
                  {completed ? 'Edit' : 'Add'}
                  {completed ? (
                    editIcon
                  ) : (
                    <span css={addIconStyles}>{addIcon}</span>
                  )}
                </span>
              </Link>
            </div>
          )}
        </div>
      </CardWithBackground>
    </>
  );
};
export default UserDetailHeaderCard;
