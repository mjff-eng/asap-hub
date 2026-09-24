import { ManuscriptFileResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { FC } from 'react';

import { colors } from '..';
import { Anchor } from '../atoms';
import { downloadIcon, linkIcon } from '../icons';
import { rem } from '../pixels';

type DiscussionAttachedFilesProps = {
  files: ManuscriptFileResponse[];
};

const containerStyles = css({
  marginTop: rem(16),
  marginLeft: rem(24),
});

const titleStyles = css({
  color: colors.colour.foreground.tertiary,
  fontSize: rem(14),
  lineHeight: rem(16),
  fontWeight: '700',
});

const filesListStyles = css({
  marginTop: rem(12),
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const fileLinkStyles = css({
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  width: 'fit-content',
  gap: rem(8),
  border: `1px solid ${colors.colour.border.tertiary}`,
  borderRadius: rem(24),
  padding: `${rem(8)} ${rem(12)} ${rem(8)} ${rem(8)}`,
  transition: 'border-color 0.2s ease-in-out',
  ':hover': {
    borderColor: colors.colour.border.secondary,
  },
});

const fileIconStyles = css({
  display: 'flex',
  '& > svg': {
    width: rem(16),
    height: rem(16),
  },
});

const fileNameStyles = css({
  fontSize: rem(14),
  fontWeight: 400,
  lineHeight: rem(16),
  color: colors.colour.foreground.primary,
  ':hover': {
    textDecoration: 'underline',
  },
});

const downloadIconStyles = css({
  display: 'flex',
  '& > svg': {
    width: rem(16),
    height: rem(16),
  },
  '& > svg > path:first-of-type': {
    fill: colors.colour.foreground.tertiary,
  },
});

const DiscussionAttachedFiles: FC<DiscussionAttachedFilesProps> = ({
  files,
}) => {
  const filesText = files.length > 1 ? 'files' : 'file';

  return (
    <div css={containerStyles}>
      <span css={titleStyles}>
        {files.length} attached {filesText}
      </span>
      <div css={filesListStyles}>
        {files.map((file) => (
          <Anchor href={file.url} css={fileLinkStyles} key={file.id}>
            <div css={fileIconStyles}>{linkIcon}</div>
            <span css={fileNameStyles}>{file.filename}</span>
            <div css={downloadIconStyles}>{downloadIcon}</div>
          </Anchor>
        ))}
      </div>
    </div>
  );
};

export default DiscussionAttachedFiles;
