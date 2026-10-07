/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { chapterSectionIndexes } from '@asap-hub/demo-timeline';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { useVideo, useVideoAccess } from '../api/hooks';
import type { Chapter, Video, VideoAccess } from '../api/types';
import { useIsCreator } from '../auth/MeContext';
import { editPathOf } from '../library/VideoCard';
import ChapterList from '../watch/ChapterList';
import Player from '../watch/Player';
import SpritePreview from '../watch/SpritePreview';
import useThumbnails from '../watch/useThumbnails';
import { PageHeading, SectionHeading } from '../layout/PageHeading';
import { Button, ButtonLink, Card, Spinner } from '../ui/components';
import { charcoal, lead, paper, rem, silver, steel } from '../ui/theme';
import { formatDuration, formatRecordedAt } from '../utils/time';

const layoutStyles = css({
  display: 'grid',
  gridTemplateColumns: `1fr minmax(${rem(260)}, ${rem(320)})`,
  gap: rem(24),
  alignItems: 'start',
  '@media (max-width: 900px)': {
    gridTemplateColumns: '1fr',
  },
});

const metaStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(12),
  fontSize: rem(14),
  color: lead.rgb,
  paddingTop: rem(12),
});

// the buttons keep to their own group so they wrap together instead of the last
// one being pushed past the right edge of the video column
const actionsStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(8),
  marginLeft: 'auto',
});

// a routed link cannot be a ButtonLink, so it carries the same secondary button
// look rather than falling back to the browser's default blue underline
const editLinkStyles = css({
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${rem(5)} ${rem(15)}`,
  borderRadius: rem(4),
  border: `${rem(1)} solid ${steel.rgb}`,
  backgroundColor: paper.rgb,
  color: charcoal.rgb,
  fontSize: rem(14),
  fontWeight: 'bold',
  textDecoration: 'none',
  transition: '200ms',
  ':hover, :focus-visible': { backgroundColor: silver.rgb },
});

const downloadFileName = (title: string) =>
  `${title.replace(/[\\/:*?"<>|]/g, '-').trim() || 'demo'}.mp4`;

const statePanelStyles = css({
  padding: rem(40),
  display: 'grid',
  gap: rem(12),
  justifyItems: 'start',
});

const previewWrapperStyles = css({ position: 'relative' });

const WatchPlayer: FC<{
  readonly video: Video;
  readonly access: VideoAccess;
  readonly onRequestAccess: () => void | Promise<unknown>;
}> = ({ video, access, onRequestAccess }) => {
  const isCreator = useIsCreator();
  const [searchParams] = useSearchParams();
  const [currentTime, setCurrentTime] = useState(0);
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);
  const thumbnails = useThumbnails(access.thumbnailsVttUrl);
  const seekRef = useRef<(seconds: number) => void>();

  const parsedStart = Number(searchParams.get('t'));
  const initialSeconds =
    Number.isFinite(parsedStart) && parsedStart > 0 ? parsedStart : undefined;

  const registerSeek = useCallback((seek: (seconds: number) => void) => {
    seekRef.current = seek;
  }, []);

  const onSelectChapter = useCallback(
    (chapter: Chapter) => seekRef.current?.(chapter.startMs / 1000),
    [],
  );

  // the render cut one file per chapter that had a stretch of its own, numbered
  // by their order among those, so a chapter is matched to its file by replaying
  // that count rather than by trusting its own position to line up
  const sectionIndexes = useMemo(
    () =>
      chapterSectionIndexes(
        video.chapters,
        video.durationMs,
        video.sectionCount ?? 0,
      ),
    [video.chapters, video.durationMs, video.sectionCount],
  );

  return (
    <div css={layoutStyles}>
      <div>
        <Player
          access={access}
          chapters={video.chapters}
          durationMs={video.durationMs}
          initialSeconds={initialSeconds}
          currentSeconds={currentTime}
          onTimeChange={setCurrentTime}
          registerSeek={registerSeek}
          onRequestAccess={onRequestAccess}
        />
        <div css={metaStyles}>
          <span>{formatRecordedAt(video.recordedAt)}</span>
          <span>{formatDuration(video.durationMs)}</span>
          <span>Recorded by {video.createdBy.name}</span>
          <span css={actionsStyles}>
            <ButtonLink
              small
              href={access.streamUrl}
              download={downloadFileName(video.title)}
            >
              Download
            </ButtonLink>
            {isCreator && (
              <Link to={editPathOf(video)} css={editLinkStyles}>
                Edit demo
              </Link>
            )}
          </span>
        </div>
      </div>

      <div css={previewWrapperStyles}>
        {hoveredChapter !== null && (
          <SpritePreview
            spriteUrl={access.spriteUrl}
            cues={thumbnails}
            seconds={hoveredChapter / 1000}
            left={0}
            anchor="top-left"
          />
        )}
        <ChapterList
          chapters={video.chapters}
          currentSeconds={currentTime}
          onSelect={onSelectChapter}
          onHover={(chapter) => setHoveredChapter(chapter?.startMs ?? null)}
          {...(access.sectionsBaseUrl
            ? {
                sectionUrlOf: (index: number) => {
                  const at = sectionIndexes[index];
                  return at === undefined
                    ? undefined
                    : `${access.sectionsBaseUrl}/${at}.mp4`;
                },
                sectionFileNameOf: (chapter: Chapter) =>
                  downloadFileName(`${video.title} - ${chapter.title}`),
              }
            : {})}
        />
      </div>
    </div>
  );
};

const Watch: FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const video = useVideo(id);
  const access = useVideoAccess(id, video.data?.mediaPath);

  if (video.isLoading) return <Spinner label="Loading demo" />;

  if (video.isError || !video.data) {
    return (
      <Card overrideStyles={statePanelStyles}>
        <PageHeading size={3}>We could not load this demo</PageHeading>
        <p css={{ color: lead.rgb, margin: 0 }}>
          It may have been removed, or you may not have access to it.
        </p>
        <Button
          onClick={() => {
            void video.refetch();
          }}
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (video.data.processingState !== 'ready') {
    const failed = video.data.processingState === 'failed';
    // a studio project that has never been exported has nothing to play, and
    // no amount of waiting will change that
    const unexported = video.data.processingState === 'empty';
    const settled = failed || unexported;
    return (
      <>
        <PageHeading>{video.data.title}</PageHeading>
        <div css={{ height: rem(16) }} />
        <Card overrideStyles={statePanelStyles}>
          <SectionHeading>
            {failed ? 'This demo failed to process' : null}
            {unexported ? 'This demo has not been exported yet' : null}
            {settled ? null : 'This demo is still processing'}
          </SectionHeading>
          <p css={{ color: lead.rgb, margin: 0 }}>
            {failed
              ? 'The recording could not be encoded. Ask a creator to upload it again.'
              : null}
            {unexported
              ? 'It is still a draft in the studio. A creator has to export it before it can be watched.'
              : null}
            {settled
              ? null
              : 'Encoding usually takes a few minutes. Check back shortly.'}
          </p>
          {!settled && (
            <Button
              onClick={() => {
                void video.refetch();
              }}
            >
              Check again
            </Button>
          )}
        </Card>
      </>
    );
  }

  if (access.isLoading) return <Spinner label="Preparing playback" />;

  if (access.isError || !access.data) {
    return (
      <>
        <PageHeading>{video.data.title}</PageHeading>
        <div css={{ height: rem(16) }} />
        <Card overrideStyles={statePanelStyles}>
          <SectionHeading>Playback is not available</SectionHeading>
          <p css={{ color: lead.rgb, margin: 0 }}>
            We could not get permission to stream this demo. Your access may
            have expired, or you may not be allowed to watch it.
          </p>
          <Button
            onClick={() => {
              void access.refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeading>{video.data.title}</PageHeading>
      <div css={{ height: rem(16) }} />
      <WatchPlayer
        video={video.data}
        access={access.data}
        onRequestAccess={async () => {
          const { isError } = await access.refetch();
          if (isError) throw new Error('Could not refresh playback access');
        }}
      />
    </>
  );
};

export default Watch;
