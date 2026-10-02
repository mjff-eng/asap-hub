import { render } from '@testing-library/react';
import { ReactElement } from 'react';

import * as messages from '..';

const { MessageLayout, WelcomeMessage } = messages;

const appOrigin = 'https://gp2.asap.science';

const templates: Record<keyof typeof messages, ReactElement> = {
  MessageLayout: <MessageLayout appOrigin={appOrigin}>text</MessageLayout>,
  WelcomeMessage: (
    <MessageLayout appOrigin={appOrigin}>
      <WelcomeMessage firstName="{{ firstName }}" link="{{ link }}" />
    </MessageLayout>
  ),
};

const renderEmail = (element: ReactElement) => {
  const { container } = render(element);
  const css = Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .map((rule) => rule.cssText)
    .join('\n');
  return { html: container.innerHTML, css };
};

describe.each(Object.entries(templates))('the %s email', (_name, element) => {
  it('does not use CSS variables, which email clients cannot resolve', () => {
    const { html, css } = renderEmail(element);
    expect(css).not.toHaveLength(0);
    expect(css.match(/[^;{}]*var\(--[^;{}]*/g) ?? []).toEqual([]);
    expect(html).not.toContain('var(--');
  });
});
