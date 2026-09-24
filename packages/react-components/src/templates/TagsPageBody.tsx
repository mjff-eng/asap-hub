import {
  EventResponse,
  InterestGroupResponse,
  NewsResponse,
  ResearchOutputResponse,
  TagSearchResponse,
  TeamListItemResponse,
  TutorialsResponse,
  UserListItemResponse,
  WorkingGroupResponse,
  ProjectResponse,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { Headline3, Paragraph } from '../atoms';
import { colour } from '../colors';
import { tagsIcon } from '../icons';
import {
  EventCard,
  InterestGroupCard,
  NewsCard,
  PeopleCard,
  ResultList,
  SharedResearchCard,
  TeamCard,
  ProjectCard,
  TutorialCard,
  WorkingGroupCard,
} from '../organisms';
import { rem } from '../pixels';
import { eventMapper } from '..';

const wrapperStyle = css({
  textAlign: 'center',
});

const iconStyles = css({
  svg: {
    width: rem(48),
    height: rem(48),
    fill: colour.foreground.primary,
  },
});

const MessageBody: React.FC<{ title: string; body: string }> = ({
  title,
  body,
}) => (
  <main css={wrapperStyle}>
    <span css={iconStyles}>{tagsIcon}</span>
    <Headline3>{title}</Headline3>
    <Paragraph accent="neutral900">{body}</Paragraph>
  </main>
);

const EntityCard: React.FC<TagsPageBodyProps['results'][number]> = ({
  ...data
}): JSX.Element => {
  /* eslint-disable-next-line no-underscore-dangle */
  const { type } = data.__meta;

  if (type === 'research-output') {
    return (
      <SharedResearchCard showTags {...(data as ResearchOutputResponse)} />
    );
  }

  if (type === 'user') {
    return <PeopleCard {...(data as UserListItemResponse)} />;
  }

  if (type === 'event') {
    return <EventCard {...eventMapper(data as EventResponse)} />;
  }

  if (type === 'working-group') {
    return <WorkingGroupCard {...(data as WorkingGroupResponse)} />;
  }

  if (type === 'interest-group') {
    return (
      <InterestGroupCard
        numberOfTeams={
          (data as InterestGroupResponse).teams.filter(
            ({ inactiveSince }) => !inactiveSince,
          ).length
        }
        googleDrive={(data as InterestGroupResponse).tools.googleDrive}
        {...(data as InterestGroupResponse)}
      />
    );
  }

  if (type === 'tutorial') {
    return <TutorialCard {...(data as TutorialsResponse)} />;
  }

  if (type === 'news') {
    return <NewsCard {...(data as NewsResponse)} type="News" />;
  }

  if (type === 'project') {
    return <ProjectCard {...(data as ProjectResponse)} />;
  }

  return <TeamCard {...(data as TeamListItemResponse)} />;
};

interface TagsPageBodyProps {
  readonly results: TagSearchResponse[];
  readonly numberOfItems: number;
  readonly numberOfPages: number;
  readonly currentPage: number;
  readonly renderPageHref: (idx: number) => string;
}

const TagsPageBody: React.FC<TagsPageBodyProps> = ({
  results,
  numberOfItems,
  numberOfPages,
  currentPage,
  renderPageHref,
}) => (
  <ResultList
    numberOfPages={numberOfPages}
    numberOfItems={numberOfItems}
    currentPageIndex={currentPage}
    renderPageHref={renderPageHref}
    noResultsComponent={
      <MessageBody
        title="Explore any tags."
        body="All CRN Hub areas with the selected tags will be listed on this page."
      />
    }
  >
    {results.map((data) => (
      <div key={data.id}>
        <EntityCard {...data} />
      </div>
    ))}
  </ResultList>
);

export default TagsPageBody;
