import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Paragraph } from '../atoms';
import { colour } from '../colors';
import { ExportIcon, linkIcon } from '../icons';
import { mobileScreen, rem } from '../pixels';
import { UploadListSourceFile } from './UploadListModal';

const buttonIconGapReset = { '> svg + span': { marginLeft: 0 } } as const;

const sectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  marginTop: rem(48),
  gap: rem(24),
});

const textStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(8),
});

const titleStyles = css({
  margin: 0,
  fontSize: rem(17),
  fontWeight: 700,
  lineHeight: rem(24),
  color: colour.foreground.primary,
});

const countStyles = css({
  fontWeight: 400,
  color: colour.foreground.tertiary,
});

const listStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
  padding: `${rem(16)} 0`,
  borderTop: `1px solid ${colour.border.tertiary}`,
  ':first-of-type': {
    borderTop: 'none',
    paddingTop: 0,
  },
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});

const infoStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(8),
  '> svg': {
    width: rem(24),
    height: rem(24),
    flexShrink: 0,
  },
});

const fileStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const nameStyles = css({
  display: 'block',
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  color: colour.foreground.primary,
});

const dateStyles = css({
  display: 'block',
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  color: colour.foreground.quaternary,
});

const downloadButtonStyles = css({
  flexGrow: 0,
  alignItems: 'center',
  height: rem(40),
  gap: rem(8),
  maxWidth: 'none',
  color: colour.foreground.primary,
  '> svg': {
    boxSizing: 'border-box',
    width: rem(24),
    height: rem(24),
    padding: rem(5),
  },
  ...buttonIconGapReset,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    width: '100%',
  },
});

type SourceListsProps = {
  files: UploadListSourceFile[];
};

const SourceLists: React.FC<SourceListsProps> = ({ files }) => {
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const handleDownload = async (file: UploadListSourceFile) => {
    if (file.onDownload) {
      setDownloadingFileId(file.id);
      try {
        await file.onDownload();
      } catch {
        // The caller surfaces the error; the row only needs to re-enable so the
        // user can retry instead of staying stuck on "downloading".
      } finally {
        setDownloadingFileId(null);
      }
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <section css={sectionStyles}>
      <div css={textStyles}>
        <h3 css={titleStyles}>
          Source lists{' '}
          <span css={countStyles}>
            • {files.length} {files.length === 1 ? 'File' : 'Files'}
          </span>
        </h3>
        <Paragraph noMargin accent="tertiary">
          The lists you uploaded. The panel shows teams, so open a file to check
          an individual. These are the files as uploaded, not the current
          attendance.
        </Paragraph>
      </div>
      <div css={listStyles}>
        {files.map((file) => (
          <div key={file.id} css={rowStyles}>
            <span css={infoStyles}>
              {linkIcon}
              <span css={fileStyles}>
                <span css={nameStyles}>{file.filename}</span>
                {file.addedDate && (
                  <span css={dateStyles}>Added {file.addedDate}</span>
                )}
              </span>
            </span>
            <Button
              small
              noMargin
              enabled={downloadingFileId !== file.id}
              loading={downloadingFileId === file.id}
              overrideStyles={downloadButtonStyles}
              onClick={() => {
                void handleDownload(file);
              }}
            >
              {downloadingFileId !== file.id && ExportIcon}
              Download
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SourceLists;
