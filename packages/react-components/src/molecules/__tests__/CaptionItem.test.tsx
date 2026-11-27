import { render, screen } from '@testing-library/react';

import CaptionItem, { LimitedDataCaptionItem } from '../CaptionItem';

it('renders label, values and icons', () => {
  render(
    <CaptionItem
      label="ASAP Output"
      belowAverageMin={0}
      belowAverageMax={1}
      averageMin={2}
      averageMax={4}
      aboveAverageMin={5}
      aboveAverageMax={10}
    />,
  );
  expect(screen.getByText('ASAP Output:')).toBeVisible();
  expect(screen.getByText('0 - 1')).toBeVisible();
  expect(screen.getByTitle('Below Average')).toBeInTheDocument();
  expect(screen.getByText('2 - 4')).toBeVisible();
  expect(screen.getByTitle('Average')).toBeInTheDocument();
  expect(screen.getByText('5 - 10')).toBeVisible();
  expect(screen.getByTitle('Above Average')).toBeInTheDocument();
});

it('renders below average without numbers when range is negative', () => {
  render(
    <CaptionItem
      label="ASAP Public Output"
      belowAverageMin={-1}
      belowAverageMax={-1}
      averageMin={0}
      averageMax={2}
      aboveAverageMin={4}
      aboveAverageMax={6}
    />,
  );
  expect(screen.getByText('ASAP Public Output:')).toBeVisible();
  expect(screen.getByText('- - -')).toBeVisible();
  expect(screen.getByTitle('Below Average')).toBeInTheDocument();
  expect(screen.getByText('0 - 2')).toBeVisible();
  expect(screen.getByTitle('Average')).toBeInTheDocument();
  expect(screen.getByText('4 - 6')).toBeVisible();
  expect(screen.getByTitle('Above Average')).toBeInTheDocument();
});

it('renders above average without numbers when range is negative', () => {
  render(
    <CaptionItem
      label="ASAP Public Output"
      belowAverageMin={0}
      belowAverageMax={2}
      averageMin={3}
      averageMax={6}
      aboveAverageMin={-1}
      aboveAverageMax={-1}
    />,
  );
  expect(screen.getByText('ASAP Public Output:')).toBeVisible();
  expect(screen.getByTitle('Below Average')).toBeInTheDocument();
  expect(screen.getByText('0 - 2')).toBeVisible();
  expect(screen.getByTitle('Average')).toBeInTheDocument();
  expect(screen.getByText('3 - 6')).toBeVisible();
  expect(screen.getByTitle('Above Average')).toBeInTheDocument();
  expect(screen.getByText('- - -')).toBeVisible();
});

it('renders percentage when percentage is enabled', () => {
  render(
    <CaptionItem
      label="ASAP % Output"
      percentage
      belowAverageMin={0}
      belowAverageMax={10}
      averageMin={11}
      averageMax={40}
      aboveAverageMin={41}
      aboveAverageMax={100}
    />,
  );
  expect(screen.getByText('0% - 10%')).toBeVisible();
  expect(screen.getByText('11% - 40%')).toBeVisible();
  expect(screen.getByText('41% - 100%')).toBeVisible();
});

it('renders the limited data caption', () => {
  render(<LimitedDataCaptionItem />);
  expect(screen.getByRole('heading', { name: 'Limited data' })).toBeVisible();
  expect(screen.getByTitle('Limited data')).toBeInTheDocument();
});
