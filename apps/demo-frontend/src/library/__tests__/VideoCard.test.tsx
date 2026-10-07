import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Video } from '../../api/types';
import { makeVideo } from '../../test-utils';
import { editPathOf, VideoCard, VideoStatusBadge } from '../VideoCard';

const project = (overrides: Partial<Video> = {}): Video => ({
  ...makeVideo(),
  kind: 'studio',
  processingState: 'empty',
  durationMs: 0,
  ...overrides,
});

const renderCard = (video: Video, onOpenMenu = jest.fn()) => {
  render(
    <MemoryRouter>
      <VideoCard
        video={video}
        view="grid"
        isCreator
        isSelected={false}
        onSelect={jest.fn()}
        onOpenMenu={onOpenMenu}
      />
    </MemoryRouter>,
  );
  return { onOpenMenu };
};

describe('editPathOf', () => {
  it('opens a studio project in the editor', () => {
    expect(editPathOf(project({ id: 'p1' }))).toBe('/studio/projects/p1');
  });

  it('opens an upload in the upload editor', () => {
    expect(editPathOf(project({ id: 'v1', kind: 'upload' }))).toBe(
      '/studio/videos/v1',
    );
  });
});

describe('VideoStatusBadge', () => {
  // a project that was never exported is not stuck encoding, it just has not
  // been finished yet, and saying "Processing" made it look broken
  it('calls a project that has never been exported a studio draft', () => {
    render(<VideoStatusBadge video={project()} />);

    expect(screen.getByText('Studio draft')).toBeVisible();
  });

  it('still reports a real encode as processing', () => {
    render(
      <VideoStatusBadge
        video={project({ kind: 'upload', processingState: 'processing' })}
      />,
    );

    expect(screen.getByText('Processing')).toBeVisible();
  });

  it('reports a failure', () => {
    render(<VideoStatusBadge video={project({ processingState: 'failed' })} />);

    expect(screen.getByText('Failed')).toBeVisible();
  });

  // "Draft" and "Studio draft" used to be the same grey pill one word apart
  it('does not draw a studio draft and a held-back video the same way', () => {
    const { container: studio } = render(
      <VideoStatusBadge video={project()} />,
    );
    const { container: held } = render(
      <VideoStatusBadge
        video={project({
          kind: 'upload',
          processingState: 'ready',
          status: 'draft',
        })}
      />,
    );

    const studioPill = studio.firstElementChild as HTMLElement;
    const heldPill = held.firstElementChild as HTMLElement;
    expect(heldPill).toHaveTextContent('Draft');
    expect(studioPill.className).not.toEqual(heldPill.className);
    // the studio pill carries a mark of its own, not just an extra word
    expect(studioPill.querySelector('svg')).toBeInTheDocument();
    expect(heldPill.querySelector('svg')).toBeNull();
  });
});

describe('VideoCard', () => {
  it('links a studio project to its editor', () => {
    renderCard(project({ id: 'p1', title: 'Untitled demo' }));

    expect(screen.getByRole('link', { name: 'Untitled demo' })).toHaveAttribute(
      'href',
      '/studio/projects/p1',
    );
  });

  it('shows no running time until there is something to play', () => {
    renderCard(project());

    expect(screen.queryByText('0:00')).not.toBeInTheDocument();
  });

  it('shows the running time of a finished demo', () => {
    renderCard(
      project({ processingState: 'ready', durationMs: 65000, kind: 'upload' }),
    );

    expect(screen.getByText('1:05')).toBeVisible();
  });

  it('never says a studio project was uploaded', () => {
    renderCard(project({ recordedAt: '2026-08-14T09:00:00.000Z' }));

    expect(screen.getByText(/^Created ·/)).toBeVisible();
    expect(screen.queryByText(/Uploaded/)).toBeNull();
  });

  it('names the year of a demo from another year', () => {
    renderCard(
      project({ kind: 'upload', recordedAt: '2019-08-14T09:00:00.000Z' }),
    );

    expect(screen.getByText(/14 Aug 2019/)).toBeVisible();
  });

  // four projects called "Untitled demo" are only told apart by what is on them
  it('tells one untitled studio draft from another', () => {
    const edited = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    renderCard(
      project({
        title: 'Untitled demo',
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 5000, title: 'Demo' },
        ],
        timeline: {
          key: 'k',
          timelineVersion: 4,
          schemaVersion: 1,
          updatedAt: edited,
        },
      }),
    );

    expect(screen.getByText('Edited 3 hours ago')).toBeVisible();
    expect(screen.getByText('2 chapters')).toBeVisible();
  });

  it('leaves the edited line off a demo that was never opened in the editor', () => {
    renderCard(project());

    expect(screen.queryByText(/Edited/)).toBeNull();
  });

  // a card holding a link and a menu button must not itself claim to be a button
  it('is not a button wrapping its own controls', () => {
    renderCard(project({ id: 'p1', title: 'Untitled demo' }));

    const card = screen.getByTestId('video-card-p1');
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card).not.toHaveAttribute('tabindex');
  });

  it('costs two tab stops: the title and one actions menu', () => {
    renderCard(project({ id: 'p1', title: 'Untitled demo' }));

    const card = screen.getByTestId('video-card-p1');
    expect(card.querySelectorAll('a, button')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Actions for Untitled demo' }),
    ).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens the actions menu from the keyboard', async () => {
    const { onOpenMenu } = renderCard(project({ title: 'Untitled demo' }));

    await userEvent.tab();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Actions for Untitled demo' }),
    ).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(onOpenMenu).toHaveBeenCalledWith(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
  });

  it('gives a member no card actions at all', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={project({
            id: 'p1',
            kind: 'upload',
            processingState: 'ready',
          })}
          view="grid"
          isCreator={false}
          isSelected={false}
          onSelect={jest.fn()}
          onOpenMenu={jest.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('video-card-p1')).not.toHaveAttribute(
      'data-selected',
    );
  });
});
