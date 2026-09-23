import { render } from '@testing-library/react';

import EventMaterialUnavailable from '../EventMaterialUnavailable';

it('renders text specific to the material type', () => {
  const { container, rerender } = render(
    <EventMaterialUnavailable materialType="Notes" />,
  );
  expect(container).toHaveTextContent(/No notes/);

  rerender(<EventMaterialUnavailable materialType="Presentation" />);
  expect(container).not.toHaveTextContent(/notes/);
  expect(container).toHaveTextContent(/No presentation/);
});
