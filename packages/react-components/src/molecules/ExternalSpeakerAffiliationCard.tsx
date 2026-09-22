import { ProjectType } from '@asap-hub/model';
import { css } from '@emotion/react';

import { Button, MultiSelect, Paragraph, Pill } from '../atoms';
import { lead, neutral1000, warning100, warning900 } from '../colors';
import {
  crossIcon,
  searchIcon,
  userPlaceholderIcon,
  WarningIcon,
} from '../icons';
import { EventTeamType } from '../organisms/shared-event-card';
import { mobileScreen, rem } from '../pixels';
import {
  flexRowGap8Styles,
  placeholderAvatarStyles,
  squareIconButtonStyles,
} from './SpeakerUserRow';

const cardStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(16),
  padding: rem(16),
  border: `1px solid ${warning900.rgb}`,
  borderRadius: rem(8),
  backgroundColor: warning100.rgb,
});

// Figma drops the warning glyph on a narrow screen: the amber ground already
// carries the state, and 24px of icon column is a quarter of the width.
const iconStyles = css({
  flexShrink: 0,
  [`@media (max-width: ${mobileScreen.max}px)`]: { display: 'none' },
});

const contentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
  flexGrow: 1,
  minWidth: 0,
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
});

// Name beside the avatar, with the "Non CRN" pill alongside on desktop and
// under them on mobile, where the bin stays pinned to the top right.
const identityStyles = css([
  flexRowGap8Styles,
  {
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
]);

const nameStyles = css({
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const dismissStyles = (enabled: boolean) =>
  css([
    squareIconButtonStyles(enabled),
    {
      marginLeft: 'auto',
    },
  ]);

const bodyStyles = css({
  color: neutral1000.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const disclaimerStyles = css({
  color: lead.rgb,
  fontSize: rem(14),
  lineHeight: rem(20),
});

const actionsStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    // "or" owns its own line once the controls stack.
    textAlign: 'center',
  },
});

const searchStyles = css({ flexGrow: 1, minWidth: 0 });

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
    <span css={iconStyles}>
      <WarningIcon />
    </span>
    <div css={contentStyles}>
      <div css={headerStyles}>
        <div css={identityStyles}>
          <span css={flexRowGap8Styles}>
            <span css={placeholderAvatarStyles}>{userPlaceholderIcon}</span>
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
      <Paragraph noMargin styles={bodyStyles}>
        This speaker is not a member on any CRN team or individual project.
        {affiliationOptions.length > 0
          ? ' Select the team or project they represented for this meeting or choose "External Guest" to proceed without an affiliation.'
          : ' Choose "External Guest" to proceed without an affiliation.'}
      </Paragraph>
      <Paragraph noMargin styles={disclaimerStyles}>
        This does not add them to a team or project.
      </Paragraph>
      <div css={actionsStyles}>
        {affiliationOptions.length > 0 && (
          <>
            <div css={searchStyles}>
              <MultiSelect<{ label: string; value: string }, false>
                isMulti={false}
                noMargin
                enabled={enabled}
                values={null}
                leftIndicator={searchIcon}
                placeholder="Search for a team or project…"
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
        >
          Keep as External Guest
        </Button>
      </div>
    </div>
  </div>
);

export default ExternalSpeakerAffiliationCard;
