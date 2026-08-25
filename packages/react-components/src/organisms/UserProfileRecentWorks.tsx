import { useContext } from 'react';
import { css } from '@emotion/react';
import { OrcidWork, UserResponse } from '@asap-hub/model';
import { format } from 'date-fns';
import { UserProfileContext } from '@asap-hub/react-context';

import {
  Card,
  Headline2,
  Headline3,
  Pill,
  Divider,
  Paragraph,
  Link,
} from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { ExternalLinkIcon, OrcidIcon } from '../icons';
import { charcoal, neutral900 } from '../colors';
import { mailToSupport } from '../mail';
import { LinkHeadline } from '../molecules';

const typeMap: { [key in OrcidWork['type']]: string } = {
  ANNOTATION: 'Other',
  ARTISTIC_PERFORMANCE: 'Other',
  BOOK_CHAPTER: 'Publication',
  BOOK_REVIEW: 'Publication',
  BOOK: 'Publication',
  CONFERENCE_ABSTRACT: 'Conference',
  CONFERENCE_PAPER: 'Conference',
  CONFERENCE_POSTER: 'Conference',
  DATA_SET: 'Other',
  DICTIONARY_ENTRY: 'Publication',
  DISCLOSURE: 'Intelectual Property',
  DISSERTATION: 'Publication',
  EDITED_BOOK: 'Publication',
  ENCYCLOPEDIA_ENTRY: 'Publication',
  INVENTION: 'Other',
  JOURNAL_ARTICLE: 'Publication',
  JOURNAL_ISSUE: 'Publication',
  LECTURE_SPEECH: 'Other',
  LICENSE: 'Intelectual Property',
  MAGAZINE_ARTICLE: 'Publication',
  MANUAL: 'Publication',
  NEWSLETTER_ARTICLE: 'Publication',
  NEWSPAPER_ARTICLE: 'Publication',
  ONLINE_RESOURCE: 'Publication',
  OTHER: 'Other',
  PATENT: 'Intelectual Property',
  PHYSICAL_OBJECT: 'Other',
  PREPRINT: 'Publication',
  REGISTERED_COPYRIGHT: 'Intelectual Property',
  REPORT: 'Publication',
  RESEARCH_TECHNIQUE: 'Other',
  RESEARCH_TOOL: 'Publication',
  SOFTWARE: 'Other',
  SPIN_OFF_COMPANY: 'Other',
  STANDARDS_AND_POLICY: 'Other',
  SUPERVISED_STUDENT_PUBLICATION: 'Publication',
  TECHNICAL_STANDARD: 'Other',
  TEST: 'Publication',
  TRADEMARK: 'Intelectual Property',
  TRANSLATION: 'Publication',
  WEBSITE: 'Publication',
  WORKING_PAPER: 'Publication',
  UNDEFINED: 'Other',
};

const headerStyles = css({
  display: 'grid',
  alignItems: 'center',
  gridColumnGap: rem(12),

  gridTemplateColumns: '100% 0 0',
  overflow: 'hidden',

  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr max-content 28px',
  },
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,

  display: 'grid',
  gridRowGap: rem(12),
});

const titleStyle = css({ fontWeight: 'bold', color: charcoal.rgb });

type UserProfileRecentWorkProps = Omit<OrcidWork, 'id'>;

type UserProfileRecentWorksProps = {
  readonly orcidWorks?: UserProfileRecentWorkProps[];
} & Pick<UserResponse, 'orcid'>;

const UserProfileRecentWork: React.FC<UserProfileRecentWorkProps> = ({
  doi,
  title,
  type,
  publicationDate,
}) => {
  let publishDateComponent = null;
  if (publicationDate.year) {
    const { year, month = '01', day = '01' } = publicationDate;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );

    publishDateComponent = (
      <Paragraph accent="neutral900">
        Originally Published:{' '}
        {format(
          date,
          `${publicationDate.day ? 'do ' : ''}${
            publicationDate.month ? 'MMMM ' : ''
          }yyyy`,
        )}
      </Paragraph>
    );
  }

  return (
    <li>
      <div>
        <Pill>{typeMap[type]}</Pill>
        {doi ? (
          <LinkHeadline level={3} styleAsHeading={4} href={doi}>
            {title}
          </LinkHeadline>
        ) : (
          <Headline3 styleAsHeading={4}>{title}</Headline3>
        )}

        {publishDateComponent}
      </div>
    </li>
  );
};

const UserProfileRecentWorks: React.FC<UserProfileRecentWorksProps> = ({
  orcidWorks = [],
  orcid,
}) => {
  const { isOwnProfile } = useContext(UserProfileContext);
  if (!isOwnProfile && orcidWorks.length === 0) return null;

  return (
    <Card>
      <div css={headerStyles}>
        <Headline2 styleAsHeading={3}>
          Recent Publications ({orcidWorks.length})
        </Headline2>
        <Paragraph accent="neutral900">Via ORCID</Paragraph>
        <span css={{ display: 'grid', svg: { fill: neutral900.rgb } }}>
          <OrcidIcon />
        </span>
      </div>
      {orcidWorks.length === 0 && isOwnProfile ? (
        <Paragraph accent="neutral900">
          <span css={titleStyle}>No works available on your ORCID.</span>
          <br />
          To complete this section, please add works to your ORCID.{' '}
          <Link
            href="https://support.orcid.org/hc/en-us/articles/360006973133-Add-works-to-your-ORCID-record"
            applyIconTheme
          >
            Learn how to add works.
            <span css={{ verticalAlign: 'top' }}>
              <ExternalLinkIcon />
            </span>
          </Link>
          <br />
          <br />
          <span css={titleStyle}>Your ORCID is: </span>
          <Link href={new URL(`https://orcid.org/${orcid}`).toString()}>
            {orcid}
          </Link>
          <br /> If this is incorrect please{' '}
          <Link href={mailToSupport({ subject: 'Orcid change request' })}>
            contact ASAP.
          </Link>
          <br /> <br />
          Works are automatically pulled via ORCID and may take up to 24 hours
          to appear here.
        </Paragraph>
      ) : (
        <ul css={listStyles}>
          {orcidWorks
            .flatMap((work, idx) => [
              <Divider key={`sep-${idx}`} />,
              <UserProfileRecentWork key={`wrk-${idx}`} {...work} />,
            ])
            .slice(1)}
        </ul>
      )}
    </Card>
  );
};

export default UserProfileRecentWorks;
