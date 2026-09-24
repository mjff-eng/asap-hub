import { css } from '@emotion/react';
import { Avatar, Button, Link, Paragraph } from '../atoms';
import { colour } from '../colors';
import { binIcon, uploadIcon } from '../icons';
import { rem } from '../pixels';

const avatarSize = 90;

const avatarStyles = css({
  width: rem(avatarSize),
  height: rem(avatarSize),
});

// equal-width columns sized to fit content, so Upload and Remove match the
// wider of the two without stretching to the full row
const buttonRowStyles = css({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  justifyContent: 'start',
  width: 'fit-content',
  gap: rem(12),
  marginTop: rem(12),
});

const buttonSlotStyles = css({
  display: 'flex',
});

const buttonContentStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

const subtitleStyles = css({
  paddingLeft: rem(6),
  color: colour.foreground.tertiary,
});

type EditUserAvatarProps = {
  readonly avatarUrl?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly onImageSelect: (file: File) => void;
  readonly onImageRemove: () => void;
  readonly enabled?: boolean;
};

const EditUserAvatar: React.FC<EditUserAvatarProps> = ({
  avatarUrl,
  firstName,
  lastName,
  onImageSelect,
  onImageRemove,
  enabled = true,
}) => (
  <div>
    <Paragraph noMargin styles={css({ paddingBottom: rem(12) })}>
      <strong>Profile Photo</strong>
      <span css={subtitleStyles}>(optional)</span>
    </Paragraph>
    <Avatar
      imageUrl={avatarUrl}
      firstName={firstName}
      lastName={lastName}
      overrideStyles={avatarStyles}
    />
    <div css={buttonRowStyles}>
      <label css={buttonSlotStyles}>
        <Link
          primary
          small
          buttonStyle
          fullWidth
          noMargin
          href={undefined}
          enabled={enabled}
        >
          <span css={buttonContentStyles}>
            {uploadIcon}
            Upload
          </span>
          <input
            disabled={!enabled}
            type="file"
            accept="image/png,image/jpeg"
            aria-label="Upload profile photo"
            onChange={(event) =>
              event.target.files?.length &&
              event.target.files[0] &&
              onImageSelect(event.target.files[0])
            }
            css={{ display: 'none' }}
          />
        </Link>
      </label>
      {avatarUrl && (
        <div css={buttonSlotStyles}>
          <Button
            small
            fullWidth
            noMargin
            enabled={enabled}
            onClick={onImageRemove}
          >
            <span css={buttonContentStyles}>
              {binIcon}
              Remove
            </span>
          </Button>
        </div>
      )}
    </div>
  </div>
);

export default EditUserAvatar;
