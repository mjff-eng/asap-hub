import { useState } from 'react';
import { css } from '@emotion/react';

import {
  UserTeam,
  WorkingGroupMembership,
  gp2 as gp2Model,
} from '@asap-hub/model';
import { network, OutputDocumentTypeParameter } from '@asap-hub/routing';
import {
  getUserRole,
  hasShareResearchOutputPermission,
} from '@asap-hub/validation';
import {
  expandUserRoles,
  type User,
  type UserTeamRoles,
  type UserWorkingGroupRoles,
} from '@asap-hub/auth';
import {
  article,
  bioinformatics,
  crnReportIcon,
  dataset,
  labMaterial,
  plusIcon,
  protocol,
  TeamIcon,
  WorkingGroupsIcon,
  chevronRightIcon,
  chevronLeftIcon,
} from '../icons';
import DropdownButton, {
  ItemType,
  ItemData,
} from '../molecules/DropdownButton';
import { rem } from '../pixels';

const ITEM_HEIGHT = 48;
const DROPDOWN_TOP_PADDING = 5;
const NUM_ITEMS_TO_SHOW = 8.5;

const iconStyles = css({
  display: 'flex',
  marginRight: rem(8),
});

export type Association =
  | UserWorkingGroupRoles
  | UserTeamRoles
  | WorkingGroupMembership
  | UserTeam
  | gp2Model.UserProject
  | gp2Model.UserWorkingGroup;

const isWGMembership = (
  association: Association,
): association is WorkingGroupMembership | UserWorkingGroupRoles =>
  (association as WorkingGroupMembership).name !== undefined;

const isUserTeam = (
  association: Association,
): association is UserTeam | UserTeamRoles =>
  (association as UserTeam).displayName !== undefined;

const isUserProject = (
  association: Association,
): association is gp2Model.UserProject =>
  (association as gp2Model.UserProject).status !== undefined;

const itemStyles = css({
  display: 'grid',
  width: '100%',
  gridTemplateColumns: 'min-content 1fr min-content',
  gridGap: rem(12),
  fontSize: rem(16),
  lineHeight: `${24 / 16}em`,
  textAlign: 'left',
  textWrap: 'wrap',
});

export const AssociationItem: React.FC<{
  association: Association;
  open?: boolean;
}> = ({ association, open = false }) => (
  <div css={itemStyles}>
    {isWGMembership(association) ? (
      <>
        <WorkingGroupsIcon />
        {association.name}
      </>
    ) : isUserTeam(association) ? (
      <>
        <TeamIcon />
        {association.displayName}
      </>
    ) : isUserProject(association) ? (
      <>
        <TeamIcon />
        {association.title}
      </>
    ) : (
      <>
        <WorkingGroupsIcon />
        {association.title}
      </>
    )}
    {open ? chevronLeftIcon : chevronRightIcon}
  </div>
);

type SharedOutputDropdownBaseProps = {
  children?: never;
  associations: ReadonlyArray<Association>;
  dropdownOptions: (association: Association) => ReadonlyArray<ItemData>;
  alignLeft?: boolean;
};

type SharedOutputDropdownProps = {
  children?: never;
  user: User | null;
};

export const SharedOutputDropdownBase: React.FC<
  SharedOutputDropdownBaseProps
> = ({ associations, dropdownOptions, alignLeft = false }) => {
  const [selectedAssociation, setSelectedAssociation] = useState<
    Association | undefined
  >(undefined);

  if (associations.length === 0) {
    return null;
  }

  const associationLinks = associations.map((association) => ({
    item: <AssociationItem association={association} />,
    closeOnClick: false,
    onClick: () => setSelectedAssociation(association),
  }));

  return (
    <DropdownButton
      primary
      dropdownHeight={ITEM_HEIGHT * NUM_ITEMS_TO_SHOW - DROPDOWN_TOP_PADDING}
      buttonChildren={() => (
        <>
          <div css={iconStyles}>{plusIcon}</div> Share an output
        </>
      )}
      alignLeft={alignLeft}
    >
      {selectedAssociation
        ? [
            {
              item: <AssociationItem open association={selectedAssociation} />,
              closeOnClick: false,
              type: 'title',
              onClick: () => setSelectedAssociation(undefined),
            },
            ...dropdownOptions(selectedAssociation),
          ]
        : associationLinks}
    </DropdownButton>
  );
};

export const SharedOutputDropdownWrapper: React.FC<
  SharedOutputDropdownProps
> = ({ user }) => {
  // Permission helpers expect one row per role; expand the grouped token user
  // back to that shape for the role lookups.
  const expandedUser = user && expandUserRoles(user);
  const associations = [
    ...(user?.teams ?? [])
      .concat()
      .filter((team) => {
        const userRole = getUserRole(expandedUser, 'teams', [team.id]);
        return hasShareResearchOutputPermission(userRole);
      })
      .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')),
    ...(user?.workingGroups ?? [])
      .concat()
      .filter((workingGroup) => {
        const userRole = getUserRole(expandedUser, 'workingGroups', [
          workingGroup.id,
        ]);
        return hasShareResearchOutputPermission(userRole);
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  const routeLink = (
    association: Association,
    outputDocumentType: OutputDocumentTypeParameter,
  ) =>
    isWGMembership(association)
      ? network({})
          .workingGroups({})
          .workingGroup({ workingGroupId: association.id })
          .createOutput({ outputDocumentType }).$
      : network({}).teams({}).team({ teamId: association.id }).createOutput({
          outputDocumentType,
        }).$;

  const dropdownOptions = (selectedAssociation: Association) => [
    {
      item: <>{article} Article</>,
      type: 'inner' as ItemType,
      href: routeLink(selectedAssociation, 'article'),
    },
    {
      item: <>{bioinformatics} Bioinformatics</>,
      type: 'inner' as ItemType,
      href: routeLink(selectedAssociation, 'bioinformatics'),
    },
    {
      item: <>{crnReportIcon} CRN Report</>,
      type: 'inner' as ItemType,
      href: routeLink(selectedAssociation, 'report'),
    },
    {
      item: <>{dataset} Dataset</>,
      type: 'inner' as ItemType,
      href: routeLink(selectedAssociation, 'dataset'),
    },
    {
      item: <>{labMaterial} Lab Material</>,
      type: 'inner' as ItemType,
      href: routeLink(selectedAssociation, 'lab-material'),
    },
    {
      item: <>{protocol} Protocol</>,
      type: 'inner' as ItemType,
      href: routeLink(selectedAssociation, 'protocol'),
    },
  ];

  return (
    <SharedOutputDropdownBase
      associations={associations}
      dropdownOptions={dropdownOptions}
    />
  );
};
