import {
  contentWidthStyles,
  pageMarginStyles,
  pixels,
  Toast,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';
import { layoutContentVerticalPadding, mainStyles } from '../layout';

import PageNotifications from './PageNotifications';

const { rem } = pixels;

// The GP2 page margins and the same vertical padding as the other GP2 pages;
// the form inside takes the width shared with the CRN forms.
const containerStyles = css(pageMarginStyles.gp2, {
  paddingTop: layoutContentVerticalPadding,
  paddingBottom: layoutContentVerticalPadding,
});

export type OutputFormPageProps = {
  message?: string;
  children?: React.ReactNode;
};

const OutputFormPage = ({ children, message = '' }: OutputFormPageProps) => (
  <PageNotifications page="output-form">
    {(notification) => (
      <article
        css={notification ? { position: 'relative', marginTop: rem(48) } : {}}
      >
        {message && <Toast accent="warning">{message}</Toast>}
        <div css={containerStyles}>
          <main css={[contentWidthStyles, mainStyles]}>{children}</main>
        </div>
      </article>
    )}
  </PageNotifications>
);
export default OutputFormPage;
