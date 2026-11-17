import { ComponentProps } from 'react';
import { EventsList } from '@asap-hub/react-components';
import { createEventResponse } from '@asap-hub/fixtures';

import { number } from './knobs';

export default {
  title: 'Templates / Events / List',
};

const props = (): ComponentProps<typeof EventsList> => {
  const numberOfItems = number('Number of Events', 16, { min: 0, max: 16 });
  const currentPageIndex = number('Current Page', 1, { min: 1, max: 2 }) - 1;

  return {
    events: Array.from({
      length: numberOfItems,
    })
      .map((_, i) => ({
        ...createEventResponse({}, i),
        tags: [],
        eventOwner: <div>ASAP Team</div>,
      }))
      .slice(currentPageIndex * 10, currentPageIndex * 10 + 10),
    numberOfItems,
    numberOfPages: Math.max(1, Math.ceil(numberOfItems / 10)),
    currentPageIndex,
    renderPageHref: (index) => `#${index}`,
  };
};

export const Normal = () => <EventsList {...props()} />;
