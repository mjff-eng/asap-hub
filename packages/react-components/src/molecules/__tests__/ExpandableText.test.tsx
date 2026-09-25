import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import ExpandableText from '../ExpandableText';

const mockScrollHeight = (scrollHeight: number) => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollHeight',
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  return () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', original);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
    }
  };
};

describe('ExpandableText', () => {
  const text = 'this is a text';
  let restoreScrollHeight = () => {};

  afterEach(() => {
    restoreScrollHeight();
    restoreScrollHeight = () => {};
  });

  it('renders the children', () => {
    render(<ExpandableText>{text}</ExpandableText>);
    expect(screen.getByText(text)).toBeVisible();
  });

  it('does not render a toggle when the text fits', () => {
    restoreScrollHeight = mockScrollHeight(80);

    render(<ExpandableText>{text}</ExpandableText>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders show more if text height is larger than max height', async () => {
    restoreScrollHeight = mockScrollHeight(125);

    render(<ExpandableText>{text}</ExpandableText>);
    const button = screen.getByRole('button');
    expect(button).toBeVisible();
    expect(button.textContent).toMatchInlineSnapshot(`"Show moreChevron Down"`);
    await userEvent.click(button);
    expect(button.textContent).toMatchInlineSnapshot(`"Show lessChevron Down"`);
  });

  it('renders show more with arrow variant', async () => {
    restoreScrollHeight = mockScrollHeight(125);

    render(<ExpandableText variant="arrow">{text}</ExpandableText>);
    const button = screen.getByRole('button');
    expect(button).toBeVisible();
    expect(button.textContent).toMatchInlineSnapshot(`"Show more ↓"`);
    await userEvent.click(button);
    expect(button.textContent).toMatchInlineSnapshot(`"Show less ↑"`);
  });

  describe('expandOnce', () => {
    const renderExpanded = async (
      overrideProps?: ComponentProps<typeof ExpandableText>,
    ) => {
      restoreScrollHeight = mockScrollHeight(125);

      render(<ExpandableText {...overrideProps}>{text}</ExpandableText>);
      const button = screen.getByRole('button');
      expect(button).toBeVisible();
      expect(button.textContent).toMatchInlineSnapshot(
        `"Show moreChevron Down"`,
      );
      await userEvent.click(button);
    };
    it('renders show less when expanded if expandOnce is not passed', async () => {
      await renderExpanded();
      expect(screen.queryByText(/less/i)).toBeInTheDocument();
    });

    it('renders show less when expanded if expandOnce is false', async () => {
      await renderExpanded({ expandOnce: false });
      expect(screen.queryByText(/less/i)).toBeInTheDocument();
    });

    it('does not render show less when expanded if expandOnce is true', async () => {
      await renderExpanded({ expandOnce: true });
      expect(screen.queryByText(/less/i)).not.toBeInTheDocument();
    });
  });
});
