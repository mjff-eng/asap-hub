import { ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';

import TutorialsDetailsPage from '../TutorialDetailsPage';

const props: ComponentProps<typeof TutorialsDetailsPage> = {
  created: '2020-09-24T11:06:27.164Z',
  title: 'Title',
  tags: [],
  relatedEvents: [],
  relatedTutorials: [],
  authors: [],
  teams: [],
};

it('renders the header', () => {
  const { getByRole } = render(<TutorialsDetailsPage {...props} />);
  expect(getByRole('heading', { level: 1 }).textContent).toMatch(/title/i);
});

it('conditionally renders description and tags', () => {
  const { getByText, rerender, queryByText } = render(
    <TutorialsDetailsPage {...props} />,
  );
  expect(
    queryByText(/description/i, { selector: 'h2' }),
  ).not.toBeInTheDocument();

  rerender(
    <TutorialsDetailsPage {...props} text="Body" tags={['Tag 1', 'Tag 2']} />,
  );
  expect(getByText(/description/i)).toBeVisible();
  expect(getByText(/Body/i)).toBeVisible();
  expect(getByText(/Tag 1/i)).toBeVisible();
});

it('conditionally renders related tutorials', () => {
  const { getByText, rerender, queryByText } = render(
    <TutorialsDetailsPage {...props} />,
  );
  expect(
    queryByText(/Related Tutorials/i, { selector: 'h2' }),
  ).not.toBeInTheDocument();

  rerender(
    <TutorialsDetailsPage
      {...props}
      relatedTutorials={[
        {
          title: 'Tutorial1',
          id: 'tutorial-1',
          isOwnRelatedTutorialLink: true,
          created: new Date(2003, 1, 1, 1).toISOString(),
        },
      ]}
    />,
  );
  expect(getByText('Related Tutorials')).toBeVisible();
  expect(getByText(/Tutorial1/i)).toBeVisible();
});

it('conditionally renders related events', () => {
  const { getByText, rerender, queryByText } = render(
    <TutorialsDetailsPage {...props} />,
  );

  expect(
    queryByText(/Related CRN Hub Events/i, { selector: 'h2' }),
  ).not.toBeInTheDocument();

  rerender(
    <TutorialsDetailsPage
      {...props}
      relatedEvents={[
        {
          title: 'Event1',
          id: 'event-1',
          endDate: new Date(2003, 1, 1, 1).toISOString(),
        },
      ]}
    />,
  );
  expect(getByText(/Related CRN Hub Events/i)).toBeVisible();
  expect(getByText(/Event1/i)).toBeVisible();
});

it('conditionally renders additional information card', () => {
  const { getByText, rerender, queryByText } = render(
    <TutorialsDetailsPage {...props} />,
  );
  expect(
    queryByText(/Additional Information/i, { selector: 'h2' }),
  ).not.toBeInTheDocument();

  rerender(<TutorialsDetailsPage {...props} asapFunded={true} />);
  expect(getByText(/Additional Information/i)).toBeVisible();
});

it('renders breadcrumbs to the tutorials list', () => {
  render(<TutorialsDetailsPage {...props} />);
  const breadcrumbs = screen.getByRole('navigation', { name: 'breadcrumbs' });
  expect(
    within(breadcrumbs).getByRole('link', { name: 'Tutorials' }),
  ).toHaveAttribute('href', '/guides-tutorials/tutorials');
  expect(within(breadcrumbs).getByText('Title')).toHaveAttribute(
    'aria-current',
    'page',
  );
});
