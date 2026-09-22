import { render, screen } from '@testing-library/react';

import { projectIcon } from '../shared-event-card';

describe('projectIcon', () => {
  test('Should return the discovery icon for a Discovery Project', () => {
    render(projectIcon('Discovery Project'));

    expect(screen.getByTitle('Discovery Project')).toBeInTheDocument();
  });

  test('Should fall back to the generic icon for an unknown type', () => {
    const { container } = render(projectIcon());

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('title')).toBeNull();
  });
});
