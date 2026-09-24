import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Avatar, Button, Link, Paragraph, PillSelector } from '../atoms';
import { fern, neutral700, neutral1000, paper, warning100 } from '../colors';
import { crossIcon, plusIcon } from '../icons';
import { projectIcon, teamIcon } from '../organisms/shared-event-card';
import { mobileScreen, rem } from '../pixels';
import { splitDisplayName } from '../utils/user';
import {
  affiliationKey,
  AffiliationOption,
} from './ExternalSpeakerAffiliationCard';
import { avatar24Styles, squareIconButtonStyles } from './SpeakerUserRow';

const mobileQuery = `@media (max-width: ${mobileScreen.max}px)`;

const cardStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
  marginBottom: rem(16),
  padding: rem(16),
  borderRadius: rem(8),
  backgroundColor: warning100.rgb,
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const avatarStyles = css([
  avatar24Styles,
  { borderRadius: '50%', boxShadow: `0 0 0 1px ${paper.rgb}` },
]);

const nameStyles = css({
  color: fern.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  [mobileQuery]: { fontSize: rem(14), lineHeight: rem(16) },
});

const dismissStyles = (enabled: boolean) =>
  css([squareIconButtonStyles(enabled), { marginLeft: 'auto' }]);

const messageStyles = css({
  color: neutral1000.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const pillStyles = css({
  maxWidth: '100%',
  height: rem(40),
  padding: `0 ${rem(16)}`,
  borderColor: neutral700.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  color: neutral1000.rgb,
  // PillSelector only sizes its direct svg children.
  '> span > svg': { width: rem(24), height: rem(24) },
  '> span:last-of-type': {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  [mobileQuery]: { fontSize: rem(14), lineHeight: rem(16) },
});

const affiliationIconStyles = css({
  display: 'inline-flex',
  flexShrink: 0,
  [mobileQuery]: { display: 'none' },
});

type PendingSpeakerCardProps = {
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly userId: string;
  readonly affiliations: ReadonlyArray<AffiliationOption>;
  readonly onPickAffiliation: (affiliation: AffiliationOption) => void;
  readonly onDismiss: () => void;
  readonly enabled?: boolean;
};

const PendingSpeakerCard: React.FC<PendingSpeakerCardProps> = ({
  displayName,
  avatarUrl,
  userId,
  affiliations,
  onPickAffiliation,
  onDismiss,
  enabled = true,
}) => (
  <div css={cardStyles} role="status">
    <div css={headerStyles}>
      <Avatar
        {...splitDisplayName(displayName)}
        imageUrl={avatarUrl}
        overrideStyles={avatarStyles}
      />
      <Link href={network({}).users({}).user({ userId }).$} openInNewTab>
        <span css={nameStyles}>{displayName}</span>
      </Link>
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
    <Paragraph noMargin styles={messageStyles}>
      Multiple affiliations were found for this speaker. Choose the team or
      individual project the speaker represented for their presentation during
      this meeting.
    </Paragraph>
    <PillSelector<string>
      fullWidthOnMobile
      enabled={enabled}
      overrideStyles={pillStyles}
      options={affiliations.map((affiliation) => ({
        value: affiliationKey(affiliation),
        label: affiliation.name,
        icon: (
          <>
            {plusIcon}
            {/* Decorative: the pill's own label already names the team or
                project, so the icon title would only double it up. */}
            <span css={affiliationIconStyles} aria-hidden>
              {affiliation.variant === 'team'
                ? teamIcon(affiliation.teamType)
                : projectIcon(affiliation.projectType)}
            </span>
          </>
        ),
      }))}
      value={[]}
      onChange={([picked]) => {
        const affiliation = affiliations.find(
          (option) => affiliationKey(option) === picked,
        );
        if (affiliation) {
          onPickAffiliation(affiliation);
        }
      }}
    />
  </div>
);

export default PendingSpeakerCard;
