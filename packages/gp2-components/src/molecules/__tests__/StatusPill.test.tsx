import { matchers } from '@emotion/jest';
import { colour } from '@asap-hub/react-components';
import { render } from '@testing-library/react';
import colors from '../../templates/colors';
import StatusPill from '../StatusPill';

expect.extend(matchers);

describe('StatusPill', () => {
  it.each`
    status                  | color
    ${'Active' as const}    | ${colors.info500.rgb}
    ${'Completed' as const} | ${colors.success500.rgb}
    ${'Paused' as const}    | ${colour.foreground.warning}
  `("has the color '$color' for the status $status", ({ status, color }) => {
    const { container } = render(<StatusPill status={status} />);
    expect(container.firstElementChild).toHaveStyleRule('color', color);
  });
});
