import { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TabbedContent from '../TabbedContent';

const props: ComponentProps<typeof TabbedContent<{ name: string }>> = {
  title: '',
  tabs: [{ tabTitle: '', items: [], empty: '' }],
  getShowMoreText: (showMore) => `View ${showMore ? 'less' : 'more'}`,
  children: ({ data }) => (
    <ul>
      {data.map(({ name }, index) => (
        <li title="item" key={`${index}`}>
          {name}
        </li>
      ))}
    </ul>
  ),
};

it('renders the tabbed card', () => {
  const { getByRole } = render(<TabbedContent {...props} title="test card" />);
  expect(getByRole('heading', { name: 'test card' })).toBeVisible();
});

it('shows a provided description', () => {
  render(<TabbedContent {...props} description="Example Description" />);
  expect(screen.getByText(/Example Description/)).toBeVisible();
});

describe('tabs', () => {
  it('can switch to the second tab', () => {
    render(
      <TabbedContent
        {...props}
        tabs={[
          {
            tabTitle: 'First Tab',
            items: [{ name: 'item a' }, { name: 'item b' }, { name: 'item c' }],
            empty: '',
          },
          {
            tabTitle: 'Second Tab',
            items: [{ name: 'item d' }, { name: 'item e' }, { name: 'item f' }],
            empty: '',
          },
        ]}
      />,
    );
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item a', 'item b', 'item c']);

    fireEvent.click(screen.getByText('Second Tab'));

    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item d', 'item e', 'item f']);
  });

  it('cannot switch to a disabled tab', () => {
    const { getByText, getByRole } = render(
      <TabbedContent
        {...props}
        tabs={[
          { items: [], tabTitle: 'First Tab', empty: '' },
          { items: [], tabTitle: 'Second Tab', disabled: true, empty: '' },
        ]}
      />,
    );
    expect(getByRole('button', { name: 'First Tab' })).toHaveStyleRule(
      'font-weight',
      'bold',
    );
    expect(getByRole('button', { name: 'First Tab' })).toBeEnabled();

    expect(getByRole('button', { name: 'Second Tab' })).toBeDisabled();
    expect(getByRole('button', { name: 'Second Tab' })).not.toHaveStyleRule(
      'font-weight',
      'bold',
    );
    fireEvent.click(getByText('Second Tab'));
    expect(getByRole('button', { name: 'First Tab' })).toBeEnabled();
    expect(getByRole('button', { name: 'First Tab' })).toHaveStyleRule(
      'font-weight',
      'bold',
    );

    expect(getByRole('button', { name: 'Second Tab' })).toBeDisabled();
    expect(getByRole('button', { name: 'Second Tab' })).not.toHaveStyleRule(
      'font-weight',
      'bold',
    );
  });

  it('calls onTabChange with the clicked tab index', () => {
    const onTabChange = jest.fn();
    render(
      <TabbedContent
        {...props}
        onTabChange={onTabChange}
        tabs={[
          { items: [], tabTitle: 'First Tab', empty: '' },
          { items: [], tabTitle: 'Second Tab', empty: '' },
        ]}
      />,
    );

    fireEvent.click(screen.getByText('Second Tab'));
    expect(onTabChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText('First Tab'));
    expect(onTabChange).toHaveBeenCalledWith(0);
  });

  it('shows the second tab', () => {
    render(
      <TabbedContent
        {...props}
        activeTabIndex={1}
        tabs={[
          { items: [{ name: 'item a' }], tabTitle: 'First Tab', empty: '' },
          { items: [{ name: 'item b' }], tabTitle: 'Second Tab', empty: '' },
        ]}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'First Tab' }),
    ).not.toHaveStyleRule('font-weight', 'bold');
    expect(screen.getByRole('button', { name: 'Second Tab' })).toHaveStyleRule(
      'font-weight',
      'bold',
    );
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item b']);
  });

  it('displays tabs as active by default', () => {
    const { rerender } = render(
      <TabbedContent
        {...props}
        tabs={[
          { items: [{ name: 'item a' }], tabTitle: 'First Tab', empty: '' },
          { items: [{ name: 'item b' }], tabTitle: 'Second Tab', empty: '' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'First Tab' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Second Tab' })).toBeEnabled();
    rerender(
      <TabbedContent
        {...props}
        tabs={[
          {
            items: [{ name: 'item a' }],
            tabTitle: 'First Tab',
            disabled: true,
            empty: '',
          },
          {
            items: [{ name: 'item b' }],
            tabTitle: 'Second Tab',
            disabled: true,
            empty: '',
          },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'First Tab' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Second Tab' })).toBeDisabled();
  });

  it('displays the empty tab state when there are no items on a tab', async () => {
    render(
      <TabbedContent
        {...props}
        activeTabIndex={0}
        tabs={[
          { items: [], tabTitle: 'First Tab', empty: 'Empty First Tab' },
          { items: [], tabTitle: 'Second Tab', empty: 'Empty Second Tab' },
        ]}
      />,
    );
    expect(screen.getByText('Empty First Tab')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Second Tab' }));
    expect(screen.getByText('Empty Second Tab')).toBeVisible();
  });
});

describe('the view more functionality', () => {
  it('display the data once the button is clicked', () => {
    render(
      <TabbedContent
        {...props}
        tabs={[
          {
            items: [
              { name: 'item a' },
              { name: 'item b' },
              { name: 'item c' },
              { name: 'item d' },
            ],
            tabTitle: 'First Tab',
            truncateFrom: 2,
            empty: '',
          },
        ]}
      />,
    );
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item a', 'item b']);
    fireEvent.click(screen.getByText(/View more/i));
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item a', 'item b', 'item c', 'item d']);
    fireEvent.click(screen.getByText(/View less/i));
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item a', 'item b']);
  });

  it('truncates on tab change', () => {
    const { getByText } = render(
      <TabbedContent
        {...props}
        tabs={[
          {
            items: [
              { name: 'item a' },
              { name: 'item b' },
              { name: 'item c' },
              { name: 'item d' },
            ],
            tabTitle: 'First Tab',
            truncateFrom: 2,
            empty: '',
          },
          {
            items: [
              { name: 'item e' },
              { name: 'item f' },
              { name: 'item g' },
              { name: 'item h' },
            ],
            tabTitle: 'Second Tab',
            truncateFrom: 2,
            empty: '',
          },
        ]}
      />,
    );
    fireEvent.click(getByText('View more'));
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item a', 'item b', 'item c', 'item d']);

    expect(getByText('View less')).toBeVisible();

    fireEvent.click(getByText('Second Tab'));
    expect(getByText('View more')).toBeVisible();
    expect(
      screen
        .getAllByRole('listitem', { name: 'item' })
        .map(({ textContent }) => textContent),
    ).toEqual(['item e', 'item f']);
  });
});
