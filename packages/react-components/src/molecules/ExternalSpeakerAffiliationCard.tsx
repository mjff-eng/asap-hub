import { ProjectType } from '@asap-hub/model';
import { css } from '@emotion/react';
import { StylesConfig } from 'react-select';

import { Button, MultiSelect, Paragraph, Pill } from '../atoms';
import { lead, neutral700, neutral1000, warning100 } from '../colors';
import { crossIcon, externalUserAvatarIcon, searchIcon } from '../icons';
import { EventTeamType } from '../organisms/shared-event-card';
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
  backgroundColor: warning100.rgb,
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
  color: neutral1000.rgb,
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
  color: neutral1000.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const disclaimerStyles = css({
  color: lead.rgb,
  fontSize: rem(14),
  lineHeight: rem(16),
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

type SearchOption = { label: string; value: string };

const searchSelectStyles: StylesConfig<SearchOption, false> = {
  control: (base, { isFocused }) => ({
    ...base,
    minHeight: rem(40),
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: rem(4),
    ...(isFocused ? {} : { borderColor: neutral700.rgb }),
  }),
  input: (base) => ({ ...base, margin: `0 ${rem(6)}`, padding: 0 }),
  placeholder: (base) => ({
    ...base,
    color: neutral700.rgb,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
};

const keepAsGuestStyles = css({
  flexGrow: 0,
  minHeight: rem(40),
  alignItems: 'center',
  borderColor: neutral700.rgb,
});

export type AffiliationOption = {
  readonly id: string;
  readonly name: string;
  readonly variant: 'team' | 'project';
  readonly teamType?: EventTeamType;
  readonly projectType?: ProjectType;
};

// Teams and projects are offered in one list, so the select value has to stay
// unique across both even if an id is ever shared between them.
export const affiliationKey = ({ variant, id }: AffiliationOption) =>
  `${variant}:${id}`;

type ExternalSpeakerAffiliationCardProps = {
  readonly displayName: string;
  readonly affiliationOptions: ReadonlyArray<AffiliationOption>;
  readonly onSelectAffiliation: (option: AffiliationOption) => void;
  readonly onKeepAsExternalGuest: () => void;
  readonly onDismiss: () => void;
  readonly enabled?: boolean;
};

const ExternalSpeakerAffiliationCard: React.FC<
  ExternalSpeakerAffiliationCardProps
> = ({
  displayName,
  affiliationOptions,
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
        <Pill accent="gray" noMargin>
          Non CRN
        </Pill>
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
        {affiliationOptions.length > 0
          ? ' Select the team or project they represented for this meeting or choose "External Guest" to proceed without an affiliation.'
          : ' Choose "External Guest" to proceed without an affiliation.'}
      </Paragraph>
      <Paragraph noMargin styles={disclaimerStyles}>
        This does not add them to a team or project.
      </Paragraph>
    </div>
    <div css={actionsStyles}>
      {affiliationOptions.length > 0 && (
        <>
          <div css={searchStyles}>
            <MultiSelect<SearchOption, false>
              isMulti={false}
              noMargin
              enabled={enabled}
              values={null}
              leftIndicator={searchIcon}
              placeholder="Search team or project..."
              styles={searchSelectStyles}
              suggestions={affiliationOptions.map((affiliation) => ({
                label: affiliation.name,
                value: affiliationKey(affiliation),
              }))}
              onChange={(option) => {
                const selected = affiliationOptions.find(
                  (affiliation) =>
                    affiliationKey(affiliation) === option?.value,
                );
                if (selected) {
                  onSelectAffiliation(selected);
                }
              }}
            />
          </div>
          <span>or</span>
        </>
      )}
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
