import { render, screen } from '@testing-library/react';
import { subHours } from 'date-fns';
import userEvent from '@testing-library/user-event';
import { EventSpeaker } from '@asap-hub/model';
import { createEventResponse } from '@asap-hub/fixtures';
import SpeakerList from '../SpeakerList';

const gridLabels = ['Speakers', 'Team', 'Speaker', 'Role'];
const team = {
  id: 'team-id-1',
  displayName: 'The team one',
};
const user = {
  id: 'user-id-1',
  firstName: 'Adam',
  lastName: 'Brown',
  displayName: 'Adam Brown',
};
const alumniUser = {
  ...user,
  alumniSinceDate: new Date('2020-06-10').toISOString(),
};
const announcedSpeaker: EventSpeaker = {
  team: { ...team },
  user: { ...user },
};
const unnanouncedSpeaker: EventSpeaker = {
  team: { ...team },
};
const alumniSpeaker: EventSpeaker = {
  team: { ...team },
  user: alumniUser,
};
const externalSpeaker: EventSpeaker = {
  externalUser: {
    name: 'Jhonny External',
  },
};

describe('When rendering the speaker list', () => {
  describe('Event is upcoming', () => {
    it('Renders an unnanounced user', async () => {
      const event = {
        ...createEventResponse(),
        speakers: [unnanouncedSpeaker],
      };

      render(<SpeakerList {...event} />);

      expect(screen.getByText('Speaker to be announced')).toBeVisible();
    });

    it('Renders an announced user', async () => {
      const event = {
        ...createEventResponse(),
        speakers: [announcedSpeaker],
      };

      render(<SpeakerList {...event} />);

      expect(
        screen.getAllByRole('link').map(({ textContent }) => textContent),
      ).toEqual(['The team one', 'Adam Brown']);

      expect(
        screen.getAllByRole('link').map((e) => e.getAttribute('href')),
      ).toEqual([
        expect.stringContaining('team-id-1'),
        expect.stringContaining('user-id-1'),
      ]);
    });

    it('Renders a user without a team', async () => {
      const event = {
        ...createEventResponse(),
        speakers: [{ user: { ...user } }],
      };

      render(<SpeakerList {...event} />);

      expect(
        screen.getAllByRole('link').map(({ textContent }) => textContent),
      ).toEqual(['Adam Brown']);
      // both the team and the role columns show a dash
      expect(screen.getAllByText('—')).toHaveLength(2);
    });

    it('Renders an alumni badge for alumni user', async () => {
      const event = {
        ...createEventResponse(),
        speakers: [alumniSpeaker],
      };

      render(<SpeakerList {...event} />);
      expect(screen.getByTitle('Alumni Member')).toBeInTheDocument();
    });

    it('Renders an announced user and checks the grid labels and role', async () => {
      const event = {
        ...createEventResponse(),
        speakers: [{ ...announcedSpeaker, role: 'Genetics' }],
      };
      render(<SpeakerList {...event} />);

      expect(
        screen.getAllByRole('heading').map(({ textContent }) => textContent),
      ).toEqual([...gridLabels]);
      expect(screen.getByText('Genetics')).toBeVisible();
    });

    it('Renders external author', async () => {
      const event = {
        ...createEventResponse(),
        speakers: [externalSpeaker],
      };

      render(<SpeakerList {...event} />);

      expect(screen.getByText('External Speaker')).toBeVisible();
      expect(screen.getByText('Jhonny External')).toBeVisible();
      expect(screen.getByText('Guest')).toBeVisible();
      expect(screen.getByTitle('External user')).toBeInTheDocument();
    });
    it('Renders show more button for more than 5 speakers', async () => {
      const event = {
        ...createEventResponse({ numberOfSpeakers: 6 }),
      };

      render(<SpeakerList {...event} />);

      expect(screen.getByRole('button', { name: /Show more/i })).toBeVisible();
    });

    it('Renders show less button when the show more button is clicked', async () => {
      const event = {
        ...createEventResponse({ numberOfSpeakers: 10 }),
      };

      render(<SpeakerList {...event} />);

      const button = screen.getByRole('button', { name: /Show more/i });
      expect(button).toBeVisible();
      await userEvent.click(button);
      expect(screen.getByRole('button', { name: /Show less/i })).toBeVisible();
    });

    it('Does not render show more button for less than 6 speakers', async () => {
      const event = {
        ...createEventResponse({
          numberOfSpeakers: 5,
          numberOfExternalSpeakers: 0,
          numberOfUnknownSpeakers: 0,
        }),
      };

      render(<SpeakerList {...event} />);

      expect(
        screen.queryByRole('button', { name: /Show more/i }),
      ).not.toBeInTheDocument();
    });

    it('Hides the 5th speaker if there are more than 5 speakers', async () => {
      const event = {
        ...createEventResponse({
          numberOfSpeakers: 6,
          numberOfExternalSpeakers: 0,
          numberOfUnknownSpeakers: 0,
        }),
      };

      render(<SpeakerList {...event} />);

      expect(
        screen.queryByRole('link', { name: 'The team 4' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Event is in the past', () => {
    it('Unnanounced user', async () => {
      const eventInThePast = {
        ...createEventResponse(),
        endDate: subHours(new Date(), 10).toISOString(),
        speakers: [unnanouncedSpeaker],
      };

      render(<SpeakerList {...eventInThePast} />);

      expect(screen.getByText('Speaker was not announced')).toBeVisible();
    });
  });
  describe('inactive badge', () => {
    const props = createEventResponse();
    it('displays inactive badge when a team is inactive', () => {
      render(
        <SpeakerList
          {...props}
          speakers={[
            {
              team: {
                displayName: 'Team',
                id: '123',
                inactiveSince: '2022-10-20T09:00:00Z',
              },
              user: {
                displayName: 'User',
                id: '123',
              },
            },
          ]}
        />,
      );

      expect(screen.getByTitle('Inactive Team')).toBeInTheDocument();
    });
  });
});
