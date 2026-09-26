import { gp2 as gp2Model } from '@asap-hub/model';
import {
  crossQuery,
  formatUserLocation,
  Link,
  pixels,
  colour,
} from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { ComponentProps, Fragment } from 'react';
import {
  locationIcon,
  roleIcon,
  workingGroupIcon,
  projectIcon,
} from '../icons';
import IconWithLabel from './IconWithLabel';
import UserRegion from './UserRegion';

const { rem } = pixels;

type UserCardInfoProps = Pick<ComponentProps<typeof UserRegion>, 'region'> &
  Pick<
    gp2Model.UserResponse,
    | 'workingGroups'
    | 'projects'
    | 'country'
    | 'stateOrProvince'
    | 'city'
    | 'role'
  >;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: rem(9),
  [crossQuery]: {
    marginBottom: rem(17),
    rowGap: rem(9),
  },
});

const dotDivider = css({
  display: 'none',
  [crossQuery]: {
    display: 'unset',
  },
});

const rowStyles = css({
  display: 'flex',
  flexDirection: 'column',
  [crossQuery]: {
    flexDirection: 'row',
    gap: rem(24),
  },
});

const listLabelStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const workingGroupsStyles = css({
  flexWrap: 'wrap',
  [crossQuery]: {
    gap: '0.25rem',
    flexDirection: 'row',
  },
});

const workingGroupsLinkStyles = css({
  [crossQuery]: {
    width: 'fit-content',
    whiteSpace: 'nowrap',
  },
});

const subduedText = css({ color: colour.foreground.quaternary });
const caseInsensitiveTitle = <T extends { title: string }>(a: T, b: T) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
const UserCardInfo: React.FC<UserCardInfoProps> = ({
  role,
  region,
  workingGroups,
  projects,
  country,
  stateOrProvince,
  city,
}) => (
  <div css={containerStyles}>
    <div css={rowStyles}>
      <IconWithLabel icon={roleIcon}>{role}</IconWithLabel>
      <UserRegion region={region} />
    </div>
    <div css={rowStyles}>
      <IconWithLabel icon={locationIcon}>
        <span>{formatUserLocation(city, stateOrProvince, country)}</span>
      </IconWithLabel>
    </div>
    <div css={rowStyles}>
      <IconWithLabel icon={workingGroupIcon}>
        <div css={[listLabelStyles, workingGroupsStyles]}>
          {workingGroups?.length > 0 ? (
            [...workingGroups]
              .sort(caseInsensitiveTitle)
              .map(({ id, title }, idx) => (
                <Fragment key={id}>
                  {idx === 0 || <span css={dotDivider}>·</span>}
                  <Link
                    href={
                      gp2Routing
                        .workingGroups({})
                        .workingGroup({ workingGroupId: id }).$
                    }
                  >
                    <span css={workingGroupsLinkStyles}>{title}</span>
                  </Link>
                </Fragment>
              ))
          ) : (
            <span css={subduedText}>
              This member isn’t part of any working groups
            </span>
          )}
        </div>
      </IconWithLabel>
    </div>
    <div css={rowStyles}>
      <IconWithLabel icon={projectIcon}>
        <div css={listLabelStyles}>
          {projects?.length ? (
            [...projects].sort(caseInsensitiveTitle).map(({ id, title }) => (
              <Link
                key={id}
                href={gp2Routing.projects({}).project({ projectId: id }).$}
              >
                {title}
              </Link>
            ))
          ) : (
            <span css={subduedText}>
              This member isn’t part of any projects
            </span>
          )}
        </div>
      </IconWithLabel>
    </div>
  </div>
);

export default UserCardInfo;
