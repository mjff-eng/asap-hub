import { render, screen } from '@testing-library/react';
import { manuscriptStatus, ManuscriptStatus } from '@asap-hub/model';
import { colour } from '../../colors';
import StatusBadge from '../StatusBadge';

// Replicate getStatusType logic locally in test
const getExpectedStyleType = (status: ManuscriptStatus) => {
  switch (status) {
    case 'Waiting for Report':
    case 'Manuscript Resubmitted':
      return 'warning';
    case 'Compliant':
    case 'Closed (other)':
      return 'final';
    case 'Review Compliance Report':
    case 'Submit Final Publication':
    case 'Addendum Required':
      return 'default';
    default:
      return 'none';
  }
};

const styleMap = {
  warning: {
    backgroundColor: colour.background.warning,
    textColor: colour.foreground.warning,
  },
  final: {
    backgroundColor: colour.background.success,
    textColor: colour.foreground.success,
  },
  default: {
    backgroundColor: colour.background.info,
    textColor: colour.foreground.info,
  },
  none: {
    backgroundColor: colour.background.info,
    textColor: colour.foreground.info,
  },
} as const;

describe('StatusBadge', () => {
  it.each(manuscriptStatus)(
    'renders correct style and label for status "%s"',
    (status) => {
      render(<StatusBadge status={status} />);

      const badge = screen.getByText(status);
      expect(badge).toBeInTheDocument();

      const type = getExpectedStyleType(status);
      const { backgroundColor, textColor } = styleMap[type];

      expect(badge).toHaveStyleRule('background-color', backgroundColor);
      expect(badge).toHaveStyleRule('color', textColor);
    },
  );

  it('includes status icon for "Compliant"', () => {
    render(<StatusBadge status="Compliant" />);
    const badge = screen.getByText('Compliant');
    const svg = badge.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does not render icon for "Review Compliance Report" (default type)', () => {
    render(<StatusBadge status="Review Compliance Report" />);
    const badge = screen.getByText('Review Compliance Report');
    const svg = badge.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });
});
