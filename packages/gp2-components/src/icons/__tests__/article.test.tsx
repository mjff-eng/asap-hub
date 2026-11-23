import { render, screen } from '@testing-library/react';
import ArticleIcon from '../article';

describe('Article icon', () => {
  it('renders article icon with default color and default size', () => {
    const { container } = render(<ArticleIcon />);

    expect(screen.getByTitle('Article')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeVisible();
    expect(svg).toHaveAttribute('width', '1.5rem');
    expect(svg).toHaveAttribute('height', '1.5rem');

    const path = container.querySelector('path');
    expect(path).toHaveAttribute('fill', '#4D646B');
  });

  it('renders article icon with passed color and size', () => {
    const { container } = render(<ArticleIcon color="#989898" size={40} />);

    expect(screen.getByTitle('Article')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeVisible();
    expect(svg).toHaveAttribute('width', '2.5rem');
    expect(svg).toHaveAttribute('height', '2.5rem');

    const path = container.querySelector('path');
    expect(path).toHaveAttribute('fill', '#989898');
  });
});
