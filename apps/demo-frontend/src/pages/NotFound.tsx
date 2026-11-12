/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';
import { Link } from 'react-router';

import { PageHeading } from '../layout/PageHeading';
import { Card } from '../ui/components';
import { lead, pine, rem } from '../ui/theme';

const panelStyles = css({
  padding: rem(40),
  display: 'grid',
  gap: rem(8),
  justifyItems: 'start',
});

const NotFound: FC = () => (
  <Card overrideStyles={panelStyles}>
    <PageHeading size={3}>Page not found</PageHeading>
    <p css={{ color: lead.rgb, margin: 0 }}>
      That page does not exist.{' '}
      <Link to="/" css={{ color: pine.rgb }}>
        Back to demos
      </Link>
      .
    </p>
  </Card>
);

export default NotFound;
