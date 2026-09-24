import { findParentWithStyle } from '@asap-hub/dom-test-utils';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import * as colors from '../../colors';

import DeliverablesCard from '../DeliverablesCard';

const props: ComponentProps<typeof DeliverablesCard> = { deliverables: [] };
it('renders the deliverables card in a default expanded state', () => {
  render(<DeliverablesCard {...props} />);
  expect(screen.getByRole('heading', { name: 'Purpose' })).toBeVisible();
});

describe('view more and less', () => {
  it('does not limit when limit is 4 and items are 4', () => {
    render(
      <DeliverablesCard
        {...props}
        limit={4}
        deliverables={Array.from({ length: 4 }).map((_, i) => ({
          description: `Item ${i}`,
          status: 'Complete',
        }))}
      />,
    );
    expect(screen.getAllByText(/Item/i).length).toEqual(4);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('limits the results to 4 by default', () => {
    render(
      <DeliverablesCard
        {...props}
        deliverables={Array.from({ length: 10 }).map((_, i) => ({
          description: `Item ${i}`,
          status: 'Complete',
        }))}
      />,
    );
    expect(screen.getAllByText(/Item/i).length).toEqual(4);
    expect(screen.getByRole('button')).toBeVisible();
  });
  it('will display and less deliverables when the button is clicked', async () => {
    render(
      <DeliverablesCard
        {...props}
        limit={5}
        deliverables={Array.from({ length: 10 }).map((_, i) => ({
          description: `Item ${i}`,
          status: 'Complete',
        }))}
      />,
    );
    expect(screen.getAllByText(/Item/i).length).toEqual(5);
    const viewLessOrMore = screen.getByRole('button');
    expect(viewLessOrMore.textContent).toMatchInlineSnapshot(
      `"View More Deliverables"`,
    );
    await userEvent.click(viewLessOrMore);

    expect(screen.getAllByText(/Item/i).length).toEqual(10);
    expect(viewLessOrMore.textContent).toMatchInlineSnapshot(
      `"View Less Deliverables"`,
    );
    await userEvent.click(viewLessOrMore);
    expect(viewLessOrMore.textContent).toMatchInlineSnapshot(
      `"View More Deliverables"`,
    );
    expect(screen.getAllByText(/Item/i).length).toEqual(5);
  });
});

it.each`
  status           | textColor
  ${'Complete'}    | ${colors.colour.foreground.success}
  ${'In Progress'} | ${colors.colour.foreground.info}
  ${'Not Started'} | ${colors.colour.foreground.error}
  ${'Incomplete'}  | ${colors.colour.foreground.warning}
  ${'Pending'}     | ${colors.colour.foreground.quaternary}
`(
  'uses the correct accent color for status $status',
  ({ status, textColor }) => {
    render(
      <DeliverablesCard
        {...props}
        deliverables={[{ description: '', status }]}
      />,
    );
    expect(
      findParentWithStyle(screen.getByText(status), 'borderStyle')!.element,
    ).toHaveStyleRule('color', textColor);
  },
);
