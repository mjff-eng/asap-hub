import {
  createListResearchOutputResponse,
  createResearchOutputResponse,
} from '@asap-hub/fixtures';
import { fireEvent, render } from '@testing-library/react';
import { ComponentProps } from 'react';
import RelatedResearchCard from '../RelatedResearchCard';

const props: ComponentProps<typeof RelatedResearchCard> = {
  relatedResearch: [],
  description: '',
  getIconForDocumentType: jest.fn(),
};

it('displays an empty state message when there is no related research', () => {
  const { getByText, getByRole, queryByRole } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[]}
      description="Find all related research."
    />,
  );
  expect(getByRole('heading', { name: 'Related Research' })).toBeVisible();
  expect(getByText('Find all related research.')).toBeVisible();
  expect(getByText('No related research available.')).toBeVisible();
  expect(queryByRole('link')).not.toBeInTheDocument();
});

it('displays the related research card header and description', () => {
  const { getByText, getByRole, queryByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          ...createResearchOutputResponse(),
        },
      ]}
      description="Find out all shared research outputs that contributed to this one."
    />,
  );
  expect(getByRole('heading', { name: 'Related Research' })).toBeVisible();
  expect(
    getByText(
      'Find out all shared research outputs that contributed to this one.',
    ),
  ).toBeVisible();
  expect(queryByText('View More Outputs')).not.toBeInTheDocument();
});

it('displays the related research card header and description passed by props', () => {
  const { getByText, getByRole, queryByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          ...createResearchOutputResponse(),
        },
      ]}
      title="Related Outputs"
      description="Find out all outputs that contributed to this one."
    />,
  );
  expect(getByRole('heading', { name: 'Related Outputs' })).toBeVisible();
  expect(
    getByText('Find out all outputs that contributed to this one.'),
  ).toBeVisible();
  expect(queryByText('View More Outputs')).toBeNull();
});

it('displays the related research links and icons', () => {
  const { getByText, getByRole, getAllByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          ...createResearchOutputResponse(),
          id: 'id-1',
          documentType: 'Article',
          title: 'Genetics',
          type: 'Preprint',
          teams: [{ id: '1', displayName: 'Team 1' }],
          workingGroups: [],
        },
      ]}
    />,
  );
  expect(getAllByText('Article').length).toEqual(1);
  expect(getByText('Preprint')).toBeVisible();
  expect(getByRole('link', { name: 'Team 1' })).toHaveAttribute(
    'href',
    '/network/teams/1',
  );
  expect(getByRole('link', { name: 'Genetics' })).toHaveAttribute(
    'href',
    '/shared-research/id-1',
  );
});

it('displays the related research links and icons given a related research with a working group entity', () => {
  const { getByText, getByRole, getAllByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          id: 'id-1',
          documentType: 'Article',
          title: 'Genetics',
          type: 'Blog',
          entity: {
            id: 'wg-1',
            title: 'Working Group 1',
            type: 'WorkingGroups',
          },
        },
      ]}
      getSourceIcon={jest.fn()}
    />,
  );
  expect(getAllByText('Article').length).toEqual(1);
  expect(getByText('Blog')).toBeVisible();
  expect(getByRole('link', { name: 'Working Group 1' })).toHaveAttribute(
    'href',
    '/working-groups/wg-1',
  );
  expect(getByRole('link', { name: 'Genetics' })).toHaveAttribute(
    'href',
    '/outputs/id-1',
  );
});

it('displays the related research links and icons given a related research with a project entity', () => {
  const { getByRole, getByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          id: 'id-1',
          documentType: 'GP2 Reports',
          title: 'Genetics',
          entity: {
            id: 'project-1',
            title: 'Project 1',
            type: 'Projects',
          },
        },
      ]}
      getSourceIcon={jest.fn()}
    />,
  );
  expect(getByText('GP2 Reports')).toBeVisible();
  expect(getByRole('link', { name: 'Project 1' })).toHaveAttribute(
    'href',
    '/projects/project-1',
  );
  expect(getByRole('link', { name: 'Genetics' })).toHaveAttribute(
    'href',
    '/outputs/id-1',
  );
});

it('does not display the team link if there is no team or working group', () => {
  const { getAllByRole } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          ...createResearchOutputResponse(),
          id: 'id-1',
          documentType: 'Article',
          title: 'Genetics',
          type: 'Preprint',
          teams: [],
          workingGroups: [],
        },
      ]}
    />,
  );

  expect(getAllByRole('link').length).toEqual(1);
});

it('displays the multiple teams label', () => {
  const { getByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          ...createResearchOutputResponse(),
          workingGroups: [],
          teams: [
            { id: '1', displayName: 'Team 1' },
            { id: '2', displayName: 'Team 2' },
          ],
        },
      ]}
    />,
  );
  expect(getByText('Multiple teams')).toBeVisible();
});

it('displays a working group over teams for working group outputs', () => {
  const { getByText } = render(
    <RelatedResearchCard
      {...props}
      relatedResearch={[
        {
          ...createResearchOutputResponse(),
          workingGroups: [{ id: '1', title: 'Working Group 1' }],
          teams: [
            { id: '1', displayName: 'Team 1' },
            { id: '2', displayName: 'Team 2' },
          ],
        },
      ]}
    />,
  );
  expect(getByText('Working Group 1')).toBeVisible();
});

it('displays the view more outputs button', () => {
  const relatedResearchList = createListResearchOutputResponse(10).items;
  relatedResearchList.push({
    ...createResearchOutputResponse(),
    id: 'id-11',
    title: 'Last related research output',
  });
  const { queryByText, getByRole } = render(
    <RelatedResearchCard {...props} relatedResearch={relatedResearchList} />,
  );

  expect(getByRole('button', { name: 'View More Outputs' })).toBeVisible();
  expect(queryByText('Last related research output')).not.toBeInTheDocument();

  const button = getByRole('button', { name: 'View More Outputs' });
  fireEvent.click(button);

  expect(getByRole('button', { name: 'View Less Outputs' })).toBeVisible();
  expect(queryByText('Last related research output')).toBeVisible();
});
