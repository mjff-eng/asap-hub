import { EventResponse, EventSpeakerTeam } from '@asap-hub/model';
import { css } from '@emotion/react';
import { colour } from '../colors';
import { rem } from '../pixels';
import AssociationList from './AssociationList';

const listItemStyles = css({
  color: colour.foreground.tertiary,
  whiteSpace: 'break-spaces',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: rem(17),
  display: 'flex',
});

const EventTeams: React.FC<{ speakers: EventResponse['speakers'] }> = ({
  speakers,
}) => {
  const teams: EventSpeakerTeam['team'][] = speakers.reduce<
    EventSpeakerTeam['team'][]
  >((acc, speaker) => {
    if ('team' in speaker && !acc.some((team) => team.id === speaker.team.id)) {
      return [...acc, speaker.team];
    }

    return acc;
  }, []);

  if (teams.length === 0) {
    return null;
  }

  return (
    <div css={listItemStyles}>
      <AssociationList
        type="Team"
        inline
        associations={teams.slice(0, 7)}
        more={teams.length > 7 ? teams.length - 7 : undefined}
      />
    </div>
  );
};

export default EventTeams;
