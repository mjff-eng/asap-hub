import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import LinkHeadline from '../LinkHeadline';

const props: Omit<ComponentProps<typeof LinkHeadline>, 'children' | 'level'> = {
  href: '',
};

describe.each<ComponentProps<typeof LinkHeadline>['level']>([1, 2, 3, 4, 5, 6])(
  'headline level %s',
  (level) => {
    it(`renders the text in an <h${level}>`, () => {
      render(
        <LinkHeadline {...props} level={level}>
          text
        </LinkHeadline>,
      );
      expect(screen.getByRole('heading').tagName).toBe(`H${level}`);
    });
    it(`renders the href`, () => {
      render(
        <LinkHeadline {...props} level={level} href="http://example.com">
          text
        </LinkHeadline>,
      );
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'http://example.com',
      );
    });

    it('removes the text margin', () => {
      const { getByRole } = render(
        <LinkHeadline {...props} level={3} noMargin>
          Title
        </LinkHeadline>,
      );
      const { marginTop, marginBottom } = getComputedStyle(
        getByRole('heading'),
      );
      expect(marginTop).toMatchInlineSnapshot(`"0px"`);
      expect(marginBottom).toMatchInlineSnapshot(`"0px"`);
    });

    const headingFontSizeVariations = {
      2: '40px',
      3: '32px',
      4: '28px',
      5: '24px',
      6: '20px',
    };

    it.each<keyof typeof headingFontSizeVariations>([2, 3, 4, 5, 6])(
      'varies the headline fontsize for level %s',
      (styleAsHeading) => {
        render(
          <LinkHeadline
            {...props}
            level={level}
            styleAsHeading={styleAsHeading}
          >
            Example
          </LinkHeadline>,
        );
        const { fontSize } = getComputedStyle(screen.getByRole('heading'));
        expect(fontSize).toEqual(headingFontSizeVariations[styleAsHeading]);
      },
    );
    it('varies the headline font weight for body/bold', () => {
      render(
        <LinkHeadline {...props} level={level} styleAsHeading="body/bold">
          Example
        </LinkHeadline>,
      );
      const { fontWeight } = getComputedStyle(screen.getByRole('heading'));
      expect(fontWeight).toEqual('700');
    });
  },
);
