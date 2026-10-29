import { ProjectType } from '@asap-hub/model';
import { css } from '@emotion/react';
import { components, StylesConfig } from 'react-select';

import {
  Button,
  MultiSelect,
  MultiSelectOptionsType,
  Paragraph,
  Pill,
} from '../atoms';
import { colour } from '../colors';
import { crossIcon, externalUserAvatarIcon, searchIcon } from '../icons';
import { EventTeamType } from '../organisms/shared-event-card';
import { statePillStyles } from '../atoms/SpeakerRoleBadge';
import { mobileScreen, rem } from '../pixels';
import {
  flexRowGap8Styles,
  placeholderAvatarStyles,
  squareIconButtonStyles,
} from './SpeakerUserRow';

const mobileQuery = `@media (max-width: ${mobileScreen.max}px)`;

const cardStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
  padding: rem(16),
  borderRadius: rem(8),
  backgroundColor: colour.background.warning,
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
});

const identityStyles = css([
  flexRowGap8Styles,
  {
    [mobileQuery]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
]);

const nameStyles = css({
  color: colour.foreground.primary,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const dismissStyles = (enabled: boolean) =>
  css([squareIconButtonStyles(enabled), { marginLeft: 'auto' }]);

const messageStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const bodyStyles = css({
  color: colour.foreground.primary,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const disclaimerStyles = css({
  color: colour.foreground.tertiary,
  fontSize: rem(14),
  lineHeight: 16 / 14,
});

const actionsStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(24),
  [mobileQuery]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: rem(12),
    textAlign: 'center',
  },
});

const searchStyles = css({ flexGrow: 1, minWidth: 0 });

type SearchOption = MultiSelectOptionsType & {
  readonly affiliation: AffiliationOption;
};

const searchSelectStyles: StylesConfig<SearchOption, false> = {
  control: (base, { isFocused }) => ({
    ...base,
    minHeight: rem(40),
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: rem(4),
    ...(isFocused ? {} : { borderColor: colour.border.secondary }),
  }),
  input: (base) => ({ ...base, margin: `0 ${rem(6)}`, padding: 0 }),
  placeholder: (base) => ({
    ...base,
    color: colour.foreground.disabled,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
};

const keepAsGuestStyles = css({
  flexGrow: 0,
  minHeight: rem(40),
  alignItems: 'center',
  borderColor: colour.border.secondary,
});

export type AffiliationOption = {
  readonly id: string;
  readonly name: string;
  readonly variant: 'team' | 'project';
  readonly teamType?: EventTeamType;
  readonly isTeamInactive?: boolean;
  readonly projectType?: ProjectType;
};

// Teams and projects are offered in one list, so the select value has to stay
// unique across both even if an id is ever shared between them.
export const affiliationKey = ({ variant, id }: AffiliationOption) =>
  `${variant}:${id}`;

type ExternalSpeakerAffiliationCardProps = {
  readonly displayName: string;
  readonly loadAffiliationOptions: (
    searchQuery: string,
  ) => Promise<ReadonlyArray<AffiliationOption>>;
  readonly onSelectAffiliation: (option: AffiliationOption) => void;
  readonly onKeepAsExternalGuest: () => void;
  readonly onDismiss: () => void;
  readonly enabled?: boolean;
};

const ExternalSpeakerAffiliationCard: React.FC<
  ExternalSpeakerAffiliationCardProps
> = ({
  displayName,
  loadAffiliationOptions,
  onSelectAffiliation,
  onKeepAsExternalGuest,
  onDismiss,
  enabled = true,
}) => (
  <div css={cardStyles} role="status">
    <div css={headerStyles}>
      <div css={identityStyles}>
        <span css={flexRowGap8Styles}>
          <span css={placeholderAvatarStyles}>{externalUserAvatarIcon}</span>
          <span css={nameStyles}>{displayName}</span>
        </span>
        <span css={statePillStyles}>
          <Pill accent="gray" noMargin>
            Non CRN
          </Pill>
        </span>
      </div>
      <Button
        noMargin
        small
        enabled={enabled}
        aria-label={`Remove ${displayName}`}
        onClick={onDismiss}
        overrideStyles={dismissStyles(enabled)}
      >
        {crossIcon}
      </Button>
    </div>
    <div css={messageStyles}>
      <Paragraph noMargin styles={bodyStyles}>
        This speaker is not a member on any CRN team or individual project.
        Select the team or project they represented for this meeting or choose
        &quot;External Guest&quot; to proceed without an affiliation.
      </Paragraph>
      <Paragraph noMargin styles={disclaimerStyles}>
        This does not add them to a team or project.
      </Paragraph>
    </div>
    <div css={actionsStyles}>
      <div css={searchStyles}>
        <MultiSelect<SearchOption, false>
          isMulti={false}
          noMargin
          enabled={enabled}
          values={null}
          leftIndicator={searchIcon}
          placeholder="Search team or project..."
          styles={searchSelectStyles}
          defaultOptions={false}
          loadOptions={async (searchQuery) =>
            (await loadAffiliationOptions(searchQuery)).map((affiliation) => ({
              label: affiliation.name,
              value: affiliationKey(affiliation),
              affiliation,
            }))
          }
          noOptionsMessage={({ inputValue }) =>
            `Sorry, no matches for ${inputValue}.`
          }
          components={{
            Menu: (menuProps) =>
              menuProps.selectProps.inputValue ? (
                <components.Menu {...menuProps} />
              ) : null,
          }}
          onChange={(option) =>
            option && onSelectAffiliation(option.affiliation)
          }
        />
      </div>
      <span>or</span>
      <Button
        noMargin
        small
        enabled={enabled}
        onClick={onKeepAsExternalGuest}
        overrideStyles={keepAsGuestStyles}
      >
        Keep as External Guest
      </Button>
    </div>
  </div>
);

export default ExternalSpeakerAffiliationCard;
