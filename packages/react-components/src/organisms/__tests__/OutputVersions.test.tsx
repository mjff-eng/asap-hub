import { createVersionList, createVersionResponse } from '@asap-hub/fixtures';
import { ThemeProvider } from '@emotion/react';
import { fireEvent, render, screen } from '@testing-library/react';
import OutputVersions, { OutputVersionsProps } from '../OutputVersions';
import { color as colorConstructor, colour, colorFromHex } from '../../colors';

const version: OutputVersionsProps['versions'][number] = {
  id: '1',
  type: 'Preprint',
  documentType: 'Article',
  title: 'Test',
  link: 'https://test.com',
};

const baseProps: OutputVersionsProps = {
  versions: [version],
};

it('displays the output versions header', () => {
  const { getByRole, queryByText } = render(<OutputVersions {...baseProps} />);
  expect(getByRole('heading', { name: 'Version History' })).toBeVisible();
  expect(queryByText('View More Versions')).toBeNull();
});

it('displays the view more versions button', () => {
  const versionList = createVersionList(10);
  versionList.push({
    ...createVersionResponse(),
    id: 'id-11',
    title: 'Last version',
  });
  const { queryByText, getByRole } = render(
    <OutputVersions versions={versionList} />,
  );

  expect(getByRole('button', { name: 'View More Versions' })).toBeVisible();
  expect(queryByText('Last version')).toBeNull();

  const button = getByRole('button', { name: 'View More Versions' });
  fireEvent.click(button);

  expect(getByRole('button', { name: 'View Less Versions' })).toBeVisible();
  expect(queryByText('Last version')).toBeVisible();
});

it('displays type as Report when document type is report.', () => {
  render(
    <OutputVersions
      versions={[{ ...version, documentType: 'Article', type: '3D Printing' }]}
    />,
  );
  expect(screen.getByText('3D Printing')).toBeVisible();

  render(
    <OutputVersions
      versions={[{ ...version, documentType: 'Report', type: '3D Printing' }]}
    />,
  );
  expect(screen.getByText('Report')).toBeVisible();
});
it('displays the correct message when versionAction is truthy', () => {
  const { getByText } = render(
    <OutputVersions {...baseProps} versionAction={'create'} />,
  );
  expect(
    getByText(
      /list with all previous output versions that contributed to this one/i,
    ),
  ).toBeVisible();
});

it('displays the correct message when versionAction is undefined', () => {
  const { getByText } = render(<OutputVersions {...baseProps} />);
  expect(
    getByText(
      /find all previous output versions that contributed to this one/i,
    ),
  ).toBeVisible();
});

describe('theming', () => {
  it('applies the default icon color', () => {
    const { getByTitle } = render(<OutputVersions {...baseProps} />);
    const icon = getByTitle('External Link');
    const { stroke } = getComputedStyle(icon.parentNode as Element);
    expect(stroke).toBe(colorFromHex(colour.brand.crn[500]).rgba);
  });

  it('uses theme primaryColor for the external icon svg', () => {
    const testColor = colorConstructor(12, 141, 195);
    const theme = {
      colors: {
        primary500: testColor,
      },
    };
    const { getByTitle } = render(
      <ThemeProvider theme={theme}>
        <OutputVersions {...baseProps} />
      </ThemeProvider>,
    );
    const icon = getByTitle('External Link');
    const { stroke } = getComputedStyle(icon.parentNode as Element);
    expect(stroke).toBe(testColor.rgba);
  });
});
