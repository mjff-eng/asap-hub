import { ComponentProps } from 'react';
import { createEventResponse } from '@asap-hub/fixtures';
import { disable, enable } from '@asap-hub/flags';
import { EventResponse } from '@asap-hub/model';
import { render } from '@testing-library/react';
import { subDays } from 'date-fns';

import EventMaterials from '../EventMaterials';

type EventMaterialsProps = ComponentProps<typeof EventMaterials>;
const props: EventMaterialsProps = {
  ...createEventResponse(),
  endDate: subDays(new Date(), 100).toISOString(),
};
const meetingMaterials: EventResponse['meetingMaterials'] = [
  {
    title: 'My additional material',
    url: 'https://example.com/material',
  },
];

it('renders nothing until an event is over', () => {
  const { container } = render(
    <EventMaterials {...props} endDate={new Date().toISOString()} />,
  );
  expect(container).toBeEmptyDOMElement();
});

describe.each`
  type                  | typeText               | presentValue            | presentExpectedText           | missingValue
  ${'notes'}            | ${'Notes'}             | ${'My Notes'}           | ${'My Notes'}                 | ${undefined}
  ${'presentation'}     | ${'Presentation'}      | ${'My Presentation'}    | ${'My Presentation'}          | ${undefined}
  ${'videoRecording'}   | ${'Video recording'}   | ${'My Video recording'} | ${'My Video recording'}       | ${undefined}
  ${'meetingMaterials'} | ${'Meeting materials'} | ${meetingMaterials}     | ${meetingMaterials[0]!.title} | ${[]}
`(
  'material of type $type',
  <T extends keyof EventMaterialsProps>({
    type,
    typeText,
    presentValue,
    presentExpectedText,
    missingValue,
  }: {
    type: T;
    typeText: string;
    presentValue: EventMaterialsProps[T];
    presentExpectedText: string;
    missingValue: EventMaterialsProps[T];
  }) => {
    it('is rendered when present', () => {
      const { getByText } = render(
        <EventMaterials {...props} {...{ [type]: presentValue }} />,
      );
      expect(getByText(presentExpectedText)).toBeInTheDocument();
    });

    it('is rendered as coming soon when missing', () => {
      const { getByText } = render(
        <EventMaterials {...props} {...{ [type]: missingValue }} />,
      );
      expect(
        getByText(new RegExp(`${typeText}.+coming soon`, 'i')),
      ).toBeInTheDocument();
    });

    it('is rendered as unavailable when null', () => {
      const { getByText } = render(
        <EventMaterials {...props} {...{ [type]: null }} />,
      );
      expect(
        getByText(new RegExp(`(^|\\W)no.+${typeText}`, 'i')),
      ).toBeInTheDocument();
    });
  },
);

it('renders a special placeholder when all materials unavailable', () => {
  const { getByText } = render(
    <EventMaterials
      {...props}
      notes={null}
      presentation={null}
      videoRecording={null}
      meetingMaterials={null}
    />,
  );
  expect(getByText(/no .* material/i)).toBeVisible();
});

it('anchors each material section with a stable id', () => {
  const { container } = render(
    <EventMaterials
      {...props}
      notes="notes"
      presentation="presentation"
      videoRecording="recording"
      meetingMaterials={[{ title: 'material', url: 'http://example.com' }]}
    />,
  );
  [
    'event-notes',
    'event-video-recording',
    'event-presentation',
    'event-additional-materials',
  ].forEach((id) => {
    expect(container.querySelector(`#${id}`)).not.toBeEmptyDOMElement();
  });
});

describe('the NEW_EVENT_PAGE flag', () => {
  const comingSoonText =
    'Meeting Materials for this event will be coming soon - usually within a week after the event. Please check back later.';
  const noMaterials = {
    notes: undefined,
    presentation: undefined,
    videoRecording: undefined,
    meetingMaterials: [],
  };

  afterEach(() => {
    disable('NEW_EVENT_PAGE');
  });

  it('renders a coming soon placeholder when no material has been added yet', () => {
    enable('NEW_EVENT_PAGE');
    const { getByText } = render(
      <EventMaterials {...props} {...noMaterials} />,
    );
    expect(getByText(comingSoonText)).toBeVisible();
  });

  it('renders the individual material cards when disabled', () => {
    disable('NEW_EVENT_PAGE');
    const { queryByText, container } = render(
      <EventMaterials {...props} {...noMaterials} />,
    );
    expect(queryByText(comingSoonText)).not.toBeInTheDocument();
    expect(container.querySelector('#event-notes')).not.toBeEmptyDOMElement();
  });

  it('renders the individual material cards when at least one material is present', () => {
    enable('NEW_EVENT_PAGE');
    const { getByText, queryByText } = render(
      <EventMaterials {...props} {...noMaterials} notes="My Notes" />,
    );
    expect(queryByText(comingSoonText)).not.toBeInTheDocument();
    expect(getByText('My Notes')).toBeVisible();
  });

  it('still renders the unavailable placeholder when all materials are permanently unavailable', () => {
    enable('NEW_EVENT_PAGE');
    const { getByText, queryByText } = render(
      <EventMaterials
        {...props}
        notes={null}
        presentation={null}
        videoRecording={null}
        meetingMaterials={null}
      />,
    );
    expect(queryByText(comingSoonText)).not.toBeInTheDocument();
    expect(getByText(/no .* material/i)).toBeVisible();
  });
});
