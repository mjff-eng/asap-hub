import { matchers } from '@emotion/jest';
import { colour } from '@asap-hub/react-components';
import { render } from '@testing-library/react';
import StatusPill from '../StatusPill';

expect.extend(matchers);

describe('StatusPill', () => {
  it.each`
    status                  | color
    ${'Active' as const}    | ${colour.foreground.info}
    ${'Completed' as const} | ${colour.foreground.success}
    ${'Paused' as const}    | ${colour.foreground.warning}
  `("has the color '$color' for the status $status", ({ status, color }) => {
    const { container } = render(<StatusPill status={status} />);
    expect(container.firstElementChild).toHaveStyleRule('color', color);
  });
});
