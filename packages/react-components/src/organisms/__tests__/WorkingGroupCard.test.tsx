import { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { findParentWithStyle } from '@asap-hub/dom-test-utils';

import WorkingGroupCard from '../WorkingGroupCard';
import { accents } from '../../atoms';
import { formatDate } from '../../date';

const props: ComponentProps<typeof WorkingGroupCard> = {
  id: '42',
  title: 'My Working Group',
  externalLink: 'https://www.google.com',
  shortText: 'My Working Group Description',
  lastModifiedDate: '2020-01-1',
  complete: false,
  tags: [],
};

it('renders the working group card', () => {
  const { getByText } = render(
    <WorkingGroupCard
      {...props}
      id="42"
      title="My Working Group"
      shortText="test description"
      lastModifiedDate="2020-01-01"
    />,
  );
  expect(getByText('My Working Group')).toBeVisible();
  expect(getByText('test description')).toBeVisible();
  expect(getByText('Access Drive')).toBeVisible();
  expect(
    getByText(`Last updated: ${formatDate(new Date('2020-01-01'))}`),
  ).toBeVisible();
});

it('renders the working group name linking to the working group', () => {
  const { getByText } = render(
    <WorkingGroupCard {...props} id="42" title="My Group" />,
  );
  expect(getByText('My Group').closest('a')).toHaveAttribute(
    'href',
    expect.stringMatching(/42$/),
  );
});

it('renders the working group shortText as plain text', () => {
  const { getByText } = render(
    <WorkingGroupCard {...props} id="42" shortText="test description" />,
  );
  expect(getByText('test description').closest('a')).not.toBeInTheDocument();
  expect(getByText('test description').closest('span')).toBeInTheDocument();
});

it('renders the state tag for a complete working group and displays the correct background color', () => {
  const { getByText, rerender, queryByText } = render(
    <WorkingGroupCard {...props} complete={true} />,
  );
  expect(getByText('Complete', { selector: 'span' })).toBeVisible();
  expect(
    findParentWithStyle(getByText(props.title), 'boxShadow')?.element,
  ).toHaveStyleRule('background-color', accents.neutral200.backgroundColor);

  rerender(<WorkingGroupCard {...props} complete={false} />);

  expect(queryByText('Complete')).not.toBeInTheDocument();
  expect(
    findParentWithStyle(getByText(props.title), 'backgroundColor')
      ?.backgroundColor,
  ).toEqual('rgb(255, 255, 255)');
});

it('renders the working group tags', () => {
  const { getByRole } = render(
    <WorkingGroupCard {...props} tags={['Test Tag']} />,
  );

  expect(getByRole('link', { name: 'Test Tag' })).toBeVisible();
});
