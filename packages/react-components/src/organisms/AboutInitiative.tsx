/* istanbul ignore file */
import { css } from '@emotion/react';

import { Card, Headline2, Link, Paragraph } from '../atoms';
import { casFontFamily, casTextStyles } from '../cas-tokens.generated';
import { colour } from '../colors';
import {
  aboutApproachBackgroundImage,
  aboutApproachBackgroundMobileImage,
  aboutApproachDiagramImage,
  aboutApproachDiagramMobileImage,
} from '../images';
import { mailToSupport } from '../mail';
import { mobileScreen, rem, remUnit, unitlessLineHeight } from '../pixels';

const mobileQuery = `@media (max-width: ${mobileScreen.max}px)`;

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(40),
});

const cardStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(40),
  padding: rem(24),
});

const introStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
});

const titleStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const eyebrowStyles = css({
  margin: 0,
  fontFamily: casFontFamily.body,
  fontSize: remUnit(casTextStyles.body.bold.fontSize),
  lineHeight: unitlessLineHeight(
    casTextStyles.body.bold.fontSize,
    casTextStyles.body.bold.lineHeight,
  ),
  fontWeight: casTextStyles.body.bold.fontWeight,
  textTransform: 'uppercase',
  color: colour.foreground.primary,
});

const pictureStyles = css({
  display: 'block',
  img: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: rem(8),
  },
});

const columnsStyles = css({
  display: 'flex',
  gap: rem(24),
  [mobileQuery]: {
    flexDirection: 'column',
  },
});

const columnStyles = css({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
});

const columnDividerStyles = css({
  borderLeft: `1px solid ${colour.border.tertiary}`,
  [mobileQuery]: {
    borderLeft: 'none',
    borderTop: `1px solid ${colour.border.tertiary}`,
  },
});

const statementStyles = css({
  margin: 0,
  fontFamily: casFontFamily.heading,
  fontSize: remUnit(casTextStyles.heading[6].regular.fontSize),
  lineHeight: unitlessLineHeight(
    casTextStyles.heading[6].regular.fontSize,
    casTextStyles.heading[6].regular.lineHeight,
  ),
  fontWeight: casTextStyles.heading[6].regular.fontWeight,
  color: colour.foreground.primary,
});

const managementColumnsStyles = css({
  display: 'grid',
  gridTemplateColumns: `${rem(380)} 1fr`,
  gap: rem(48),
  [mobileQuery]: {
    gridTemplateColumns: '1fr',
    gap: rem(24),
  },
});

const managementColumnStyles = css({
  '::before': {
    content: '""',
    display: 'block',
    height: rem(7),
    marginBottom: rem(24),
    border: `1px solid ${colour.border.secondary}`,
    borderTop: 'none',
    [mobileQuery]: {
      display: 'none',
    },
  },
});

const ResponsiveImage: React.FC<{
  src: string;
  mobileSrc: string;
  alt: string;
}> = ({ src, mobileSrc, alt }) => (
  <picture css={pictureStyles}>
    <source media={`(max-width: ${mobileScreen.max}px)`} srcSet={mobileSrc} />
    <img src={src} alt={alt} />
  </picture>
);

const AboutInitiative: React.FC = () => (
  <div css={containerStyles}>
    <Card shadow={false} padding={false} overrideStyles={cardStyles}>
      <div css={introStyles}>
        <div css={titleStyles}>
          <p css={eyebrowStyles}>The initiative</p>
          <Headline2 styleAsHeading={4} noMargin>
            Changing the way science is typically done
          </Headline2>
        </div>
        <div>
          <Paragraph accent="primary">
            <strong>Aligning Science Across Parkinson's</strong> is a global
            research initiative. With input across sectors and disciplines, we
            are creating collaborative and transparent research processes in an
            environment that can drive discoveries for Parkinson's disease
            research.
          </Paragraph>
          <Paragraph accent="primary">
            We differ from traditional funding programs in our ability to make
            large, long-term commitments, our appetite for risk, and our belief
            that a collaborative, open approach accelerates advances.
          </Paragraph>
        </div>
      </div>
      <ResponsiveImage
        src={aboutApproachBackgroundImage}
        mobileSrc={aboutApproachBackgroundMobileImage}
        alt="Our approach: Support Collaboration, so researchers exchange ideas early in a collaborative, not competitive manner; Share Data, so researchers can build upon the work of others through shared outputs; and Generate Resources, building infrastructure to improve access to tools, reproducibility, and efficiency. Together they accelerate discoveries."
      />
      <div css={columnsStyles}>
        <div css={columnStyles}>
          <h3 css={eyebrowStyles}>Vision</h3>
          <p css={statementStyles}>
            Collaborative and transparent research that delivers faster, better
            outcomes for Parkinson's disease.
          </p>
        </div>
        <div css={columnDividerStyles} />
        <div css={columnStyles}>
          <h3 css={eyebrowStyles}>Mission</h3>
          <p css={statementStyles}>
            Accelerating discovery and informing the path to a cure through
            collaboration, research-enabling resources and data sharing.
          </p>
        </div>
      </div>
    </Card>
    <Card shadow={false} padding={false} overrideStyles={cardStyles}>
      <div css={titleStyles}>
        <Headline2 styleAsHeading={4} noMargin>
          Management and Implementation
        </Headline2>
        <Paragraph accent="secondary" noMargin>
          ASAP is structured to ensure both strategic oversight and operational
          excellence.
        </Paragraph>
      </div>
      <ResponsiveImage
        src={aboutApproachDiagramImage}
        mobileSrc={aboutApproachDiagramMobileImage}
        alt="ASAP is managed by the Coalition for Aligning Science together with the Michael J. Fox Foundation, and runs three programs: CRN, the basic biology discovery program; GP2, the genetics discovery program; and the Parkinson's Progression Markers Initiative, the biomarker program."
      />
      <div css={managementColumnsStyles}>
        <div css={managementColumnStyles}>
          <Paragraph accent="primary" noMargin>
            ASAP is managed by the{' '}
            <strong>Coalition for Aligning Science</strong> (CAS) and
            implemented in partnership with the{' '}
            <strong>Michael J. Fox Foundation</strong> (MJFF).
          </Paragraph>
          <Paragraph accent="primary">
            You will interact with individuals from both teams through the
            duration of your grant.
          </Paragraph>
        </div>
        <div css={managementColumnStyles}>
          <Paragraph accent="primary" noMargin>
            ASAP's research mission is carried out through{' '}
            <strong>three primary programs</strong>, which collectively work to
            drive our goals forward and accelerate the path to a cure.
          </Paragraph>
        </div>
      </div>
    </Card>
    <Paragraph accent="tertiary" noMargin>
      If you're facing a technical issue with the Hub, our team is happy to
      help! <Link href={mailToSupport()}>Contact tech support</Link>.
    </Paragraph>
  </div>
);

export default AboutInitiative;
