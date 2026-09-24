import { render, screen } from '@testing-library/react';

import ButtonLink from '../ButtonLink';
import Layout from '../Layout';
import { colour } from '../../colors';

it('renders a link to the given href', () => {
  render(<ButtonLink href="https://example.com">Create account</ButtonLink>);
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
    'href',
    'https://example.com',
  );
});

it('fills the button with the hex brand colour of the email layout', () => {
  render(
    <Layout appOrigin="https://hub.asap.science">
      <ButtonLink href="https://example.com">Create account</ButtonLink>
    </Layout>,
  );
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveStyleRule(
    'background-color',
    colour.brand.crn[600],
  );
});
