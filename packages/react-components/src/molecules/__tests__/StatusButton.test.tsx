import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { colour } from '../../colors';
import { portalContainerId } from '../../utils/portal';

import StatusButton, {
  iconStyles,
  statusButtonStyles,
  statusIcon,
  statusTagStyles,
  StatusType,
} from '../StatusButton';

beforeEach(() => {
  document.getElementById(portalContainerId)?.remove();

  const portalContainer = document.createElement('div');
  portalContainer.id = portalContainerId;
  document.body.appendChild(portalContainer);
});

afterEach(() => {
  document.getElementById(portalContainerId)?.remove();
});

it('renders a StatusButton as Label when canEdit is false', () => {
  render(<StatusButton buttonChildren={() => <>Status</>} />);
  expect(screen.getByRole('button').textContent).toContain('Status');
  expect(screen.getByRole('button')).toBeDisabled();
});

it('renders a StatusButton as dropdown when canEdit is true', () => {
  render(<StatusButton buttonChildren={() => <>Status</>} canEdit={true} />);
  expect(screen.getByRole('button').textContent).toContain('Status');
  expect(screen.getByRole('button')).toBeEnabled();
});

it('renders a StatusButton button item', async () => {
  const onClick = jest.fn();
  render(
    <StatusButton buttonChildren={() => <>Example</>} canEdit={true}>
      {{ item: 'Example Button', onClick }}
      {{ item: 'Second Item', onClick: jest.fn() }}
    </StatusButton>,
  );
  await userEvent.click(screen.getByRole('button'));
  await userEvent.click(screen.getByRole('button', { name: 'Example Button' }));

  expect(onClick).toHaveBeenCalled();
});

it('renders a modal on click', async () => {
  render(
    <StatusButton buttonChildren={() => <>test</>} canEdit={true}>
      {{ item: '1', onClick: jest.fn() }}
      {{ item: '2', onClick: jest.fn() }}
      {{ item: '3', onClick: jest.fn() }}
    </StatusButton>,
  );
  await userEvent.click(screen.getByRole('button'));

  expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    '1',
    '2',
    '3',
  ]);
});

it('renders items on modal and hides it on outside click', async () => {
  jest.spyOn(console, 'error').mockImplementation();
  render(
    <>
      <h1>Element</h1>
      <StatusButton buttonChildren={() => <>test</>} canEdit={true}>
        {{ item: '1', onClick: jest.fn() }}
        {{ item: '2', onClick: jest.fn(), type: 'warning' }}
        {{ item: '3', onClick: jest.fn(), type: 'final' }}
      </StatusButton>
    </>,
  );

  await userEvent.click(screen.getByRole('button'));
  screen.getAllByRole('listitem').forEach((e) => expect(e).toBeVisible());
  await userEvent.click(screen.getByRole('heading'));
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

it('renders the menu in the portal positioned below the button', async () => {
  render(
    <StatusButton buttonChildren={() => <>test</>} canEdit={true}>
      {{ item: '1', onClick: jest.fn() }}
      {{ item: '2', onClick: jest.fn() }}
    </StatusButton>,
  );

  const statusButton = screen.getByTestId('status-button');
  const statusButtonContainer = statusButton.parentElement as HTMLDivElement;
  jest.spyOn(statusButtonContainer, 'getBoundingClientRect').mockReturnValue({
    bottom: 52,
    height: 32,
    left: 30,
    right: 170,
    top: 20,
    width: 140,
    x: 30,
    y: 20,
    toJSON: jest.fn(),
  });

  await userEvent.click(statusButton);

  const portalContainer = document.getElementById(portalContainerId);
  expect(portalContainer).toBeInTheDocument();

  const menu = within(portalContainer as HTMLElement).getByRole(
    'list',
  ).parentElement;
  expect(menu).toHaveStyle('position: fixed');
  expect(menu).toHaveStyle('top: 60px');
  expect(menu).toHaveStyle('left: 30px');
});

it('hides the menu on resize', async () => {
  render(
    <StatusButton buttonChildren={() => <>test</>} canEdit={true}>
      {{ item: '1', onClick: jest.fn() }}
      {{ item: '2', onClick: jest.fn() }}
    </StatusButton>,
  );

  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('list')).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new Event('resize'));
  });

  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

it('hides the menu on scroll', async () => {
  render(
    <StatusButton buttonChildren={() => <>test</>} canEdit={true}>
      {{ item: '1', onClick: jest.fn() }}
      {{ item: '2', onClick: jest.fn() }}
    </StatusButton>,
  );

  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('list')).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });

  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

describe('statusButtonStyles', () => {
  it.each([
    ['warning', true, colour.background.warning, colour.foreground.warning],
    ['final', true, colour.background.success, colour.foreground.success],
    ['default', true, colour.background.info, colour.foreground.info],
    ['none', true, colour.background.info, colour.foreground.info],
  ] as [StatusType, boolean, string, string][])(
    'applies correct styles for type %s and isComplianceReviewer %s',
    (type, isComplianceReviewer, expectedBackgroundColor, expectedColor) => {
      const { container } = render(
        <div css={statusButtonStyles(type, isComplianceReviewer)} />,
      );
      expect(container.firstChild).toHaveStyleRule(
        'background',
        expectedBackgroundColor,
      );
      expect(container.firstChild).toHaveStyleRule('color', expectedColor);
    },
  );
});

describe('statusTagStyles', () => {
  it.each([
    ['warning', colour.background.info, colour.foreground.info],
    ['final', colour.background.success, colour.foreground.success],
    ['default', colour.background.warning, colour.foreground.warning],
    ['none', colour.background.info, colour.foreground.info],
  ] as [StatusType, string, string][])(
    'applies correct styles for type %s',
    (type, expectedBackgroundColor, expectedColor) => {
      const { container } = render(<div css={statusTagStyles(type)}>Test</div>);

      expect(container.firstChild).toHaveStyleRule(
        'background',
        expectedBackgroundColor,
      );
      expect(container.firstChild).toHaveStyleRule('color', expectedColor);
    },
  );
});

describe('iconStyles', () => {
  it.each([
    ['warning', true, colour.foreground.warning],
    ['final', true, colour.foreground.success],
    ['final', false, colour.foreground.success],
    ['default', false, colour.foreground.warning],
  ] as [StatusType, boolean, string | null][])(
    'applies correct styles for icon with type %s and isComplianceReviewer %s',
    (type, isComplianceReviewer, iconExpectedColor) => {
      const { container } = render(
        <span css={iconStyles(type, isComplianceReviewer)}>
          {statusIcon(type, isComplianceReviewer)}
        </span>,
      );
      const pathElement =
        container.querySelector('svg g path') ??
        container.querySelector('svg rect');

      expect(pathElement).toBeInTheDocument();
      expect(pathElement).toHaveStyle(`fill: ${iconExpectedColor}`);
    },
  );

  it.each([
    ['default', true, null],
    ['none', true, null],
    ['warning', false, null],
    ['none', false, null],
  ] as [StatusType, boolean, string | null][])(
    'applies correct styles for icon with type %s and isComplianceReviewer %s (where icon should not show)',
    (type, isComplianceReviewer) => {
      const { container } = render(
        <span css={iconStyles(type, isComplianceReviewer)}>
          {statusIcon(type, isComplianceReviewer)}
        </span>,
      );
      const svgElement = container.querySelector('svg');
      expect(svgElement).not.toBeInTheDocument();
    },
  );
});
