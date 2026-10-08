import { render, screen } from '@testing-library/react';

import ButtonLink from '../ButtonLink';
import Layout from '../Layout';
import { themeColour } from '../../theme';

it('renders a link to the given href', () => {
  render(<ButtonLink href="https://example.com">Create account</ButtonLink>);
  expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
    'href',
    'https://example.com',
  );
});

it('draws the button with the hex primary button colours of the email layout', () => {
  render(
    <Layout appOrigin="https://hub.asap.science">
      <ButtonLink href="https://example.com">Create account</ButtonLink>
    </Layout>,
  );
  const button = screen.getByRole('link', { name: 'Create account' });
  expect(button).toHaveStyleRule(
    'background-color',
    themeColour('crn', 'colour/background/button/primary/default'),
  );
  expect(button).toHaveStyleRule(
    'border-color',
    themeColour('crn', 'colour/border/button/primary/default'),
  );
});
