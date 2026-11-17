import { EventPage, getIconForDocumentType } from '@asap-hub/react-components';
import { createEventResponse } from '@asap-hub/fixtures';

import { boolean, number } from './knobs';
import { LayoutDecorator } from './layout';

export default {
  title: 'Templates / Events / Detail Page',
  component: EventPage,
  decorators: [LayoutDecorator],
};

export const Normal = () => (
  <EventPage
    {...createEventResponse({
      numberOfSpeakers: number('Number of speakers', 4),
      numberOfUnknownSpeakers: number('Number of unknown speakers', 2),
      numberOfExternalSpeakers: number('Number of external speakers', 0),
      isEventInThePast: boolean('Has the event passed', false),
    })}
    hasFinished={false}
    tags={[]}
    backHref="#"
    inPerson={boolean('In Person', false)}
    eventOwner={<div>ASAP Team</div>}
    displayCalendar={boolean('display calendar', true)}
    getIconForDocumentType={() => getIconForDocumentType('Article')}
  />
);
