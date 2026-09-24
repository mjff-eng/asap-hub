import { gp2 } from '@asap-hub/model';
import {
  Button,
  Card,
  chevronCircleDownIcon,
  chevronCircleUpIcon,
  ExternalLinkIcon,
  Headline3,
  infoCircleYellowIcon,
  Link,
  LinkHeadline,
  Paragraph,
  Pill,
  pixels,
  Subtitle,
  colour,
} from '@asap-hub/react-components';

import { css } from '@emotion/react';
import { useState } from 'react';
import { addIcon, editIcon } from '../icons';
import { mobileQuery, nonMobileQuery } from '../layout';

export type ResourcesProps = {
  resources?: gp2.Resource[];
  headline: string;
  add?: string;
  edit?: string;
};

const { rem } = pixels;
const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  padding: `0 0 ${rem(48)}`,
});
const rowStyles = css({
  display: 'flex',
  paddingBottom: rem(16),
  flexDirection: 'row',
});
const buttonWrapperStyles = css({
  paddingTop: rem(8),
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  borderBottom: `transparent`,
});
const buttonStyles = css({
  [mobileQuery]: {
    flexDirection: 'column-reverse',
    gap: rem(24),
  },
});
const editButtonStyles = css({
  [nonMobileQuery]: {
    marginLeft: 'auto',
  },
});
const resourceTitleContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  padding: `${rem(8)} 0`,
});
const resourceLinkStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(8),
  ':hover': {
    svg: {
      stroke: colour.brand.gp2[500],
    },
  },
});
const hideStyles = css({
  [`:nth-of-type(n+4)`]: { display: 'none' },
});

const Resources: React.FC<ResourcesProps> = ({
  resources,
  headline,
  add,
  edit,
}) => {
  const minimumResourcesToDisplay = 3;
  const [expanded, setExpanded] = useState(false);
  const getResourcesListStyles = () => {
    if ((resources || []).length < minimumResourcesToDisplay + 1 || expanded) {
      return [];
    }

    return [hideStyles];
  };

  return (
    <div css={containerStyles}>
      <Card padding={false} accent={'warning'}>
        <div
          css={{
            display: 'flex',
            gap: rem(16),
            padding: `${rem(32)} ${rem(24)}`,
          }}
        >
          {infoCircleYellowIcon}
          <div>
            <b>Please note</b>
            <br />
            {headline}
          </div>
        </div>
      </Card>

      <Card>
        <div css={[rowStyles, buttonStyles]}>
          <Headline3 noMargin>Workspace Resources</Headline3>
          {add && (
            <div css={editButtonStyles}>
              <Link href={add} fullWidth buttonStyle noMargin small>
                <span
                  css={{
                    display: 'inline-flex',
                    gap: rem(8),
                    padding: `0 ${rem(3)}`,
                  }}
                >
                  Add {addIcon}
                </span>
              </Link>
            </div>
          )}
        </div>
        <div css={css({ paddingBottom: rem(32) })}>
          View and share important notes and links for your team.
        </div>
        <div
          css={css({ display: 'flex', flexDirection: 'column', gap: rem(32) })}
        >
          {resources?.map((resource, index) => (
            <div key={`resource-${index}`} css={getResourcesListStyles()}>
              <Card>
                <div css={[rowStyles, buttonStyles]}>
                  <Pill small={false}>
                    {resource.type === 'Link' ? 'Link' : 'Note'}
                  </Pill>
                  {edit && (
                    <div css={editButtonStyles}>
                      <Link
                        href={`${edit}/${index}`}
                        buttonStyle
                        noMargin
                        small
                      >
                        <span
                          css={{
                            display: 'inline-flex',
                            gap: rem(8),
                            margin: `0 ${rem(3)}`,
                          }}
                        >
                          Edit {editIcon}
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
                <div css={resourceTitleContainerStyles}>
                  {resource.type === 'Link' ? (
                    <LinkHeadline
                      noMargin
                      level={4}
                      href={resource.externalLink}
                    >
                      <span css={resourceLinkStyles}>
                        {resource.title}
                        <ExternalLinkIcon />
                      </span>
                    </LinkHeadline>
                  ) : (
                    <Subtitle styleAsHeading={4} noMargin>
                      {resource.title}
                    </Subtitle>
                  )}
                </div>
                <Paragraph noMargin accent="tertiary">
                  {resource.description}
                </Paragraph>
              </Card>
            </div>
          ))}
        </div>
        {resources && resources.length > minimumResourcesToDisplay && (
          <div css={buttonWrapperStyles}>
            <Button linkStyle onClick={() => setExpanded(!expanded)}>
              <span
                css={{
                  display: 'inline-grid',
                  verticalAlign: 'middle',
                  paddingRight: rem(12),
                }}
              >
                {expanded ? chevronCircleUpIcon : chevronCircleDownIcon}
              </span>
              Show {expanded ? 'less' : 'more'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Resources;
