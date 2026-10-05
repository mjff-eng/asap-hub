import { render } from '@testing-library/react';

import UserAvatar from '../UserAvatar';

describe('member avatar award badge', () => {
  it('displays avatar with badge if a badge url is provided', () => {
    const { getByAltText } = render(
      <UserAvatar
        firstName="Bat"
        lastName="Man"
        badgeUrl="https://example.com"
        badgeAlt="Open Science Champion"
      />,
    );

    const badge = getByAltText('Open Science Champion');
    expect(badge).toHaveAttribute('src', 'https://example.com');
  });

  it('does not render an award badge when no badge url is provided', () => {
    const { queryByAltText } = render(
      <UserAvatar
        firstName="Bat"
        lastName="Man"
        badgeUrl={undefined}
        badgeAlt="Open Science Champion"
      />,
    );

    expect(queryByAltText('Open Science Champion')).not.toBeInTheDocument();
  });
});
