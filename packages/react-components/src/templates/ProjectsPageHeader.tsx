import { css } from '@emotion/react';
import { projects } from '@asap-hub/routing';

import { Display, Paragraph, TabLink } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import { neutral900, neutral1000 } from '../colors';
import { SearchAndFilter } from '../organisms';
import { TabNav } from '../molecules';
import {
  DiscoveryProjectIcon,
  ResourceProjectIcon,
  TraineeProjectIcon,
} from '../icons';
import { Option, Title } from '../organisms/CheckboxGroup';
import PageInfoContainer from './PageInfoContainer';
import PageConstraints from './PageConstraints';

const descriptionStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const projectTypeDescriptionStyles = css({
  marginBottom: rem(48),
});

type Page = 'Discovery' | 'Resource' | 'Trainee';

type ProjectsPageHeaderProps = {
  page: Page;
  filters?: Set<string>;
  onChangeFilter?: (filter: string) => void;
  searchQuery: string;
  onChangeSearchQuery?: (newSearchQuery: string) => void;
  showSearch?: boolean;
  filterOptions?: ReadonlyArray<Option<string> | Title>;
};

const projectDescriptions: Record<Page, string> = {
  Discovery:
    'Discovery Projects are collaborative research projects whose primary objective is to advance scientific understanding within a defined theme or area of inquiry. These projects are carried out by Discovery Teams.',
  Resource:
    'Resource Projects are projects whose primary objective is to generate research tools, materials, or infrastructure for the scientific community to leverage, or to re-analyze existing datasets to ensure that maximum insights are gained from data already collected. ',
  Trainee:
    'Trainee Projects provide early-career scientists with dedicated support to expand their expertise and build independent research capacity.',
};

const ProjectsPageHeader: React.FC<ProjectsPageHeaderProps> = ({
  page,
  searchQuery,
  onChangeSearchQuery,
  filters,
  onChangeFilter,
  showSearch = true,
  filterOptions = [],
}) => {
  const isDiscoveryActive = page === 'Discovery';
  const isResourceActive = page === 'Resource';
  const isTraineeActive = page === 'Trainee';

  return (
    <header>
      <PageInfoContainer
        nav={
          <TabNav>
            <TabLink
              href={projects.template + projects({}).discoveryProjects.template}
              Icon={() => (
                <DiscoveryProjectIcon
                  color={isDiscoveryActive ? neutral1000.rgb : neutral900.rgb}
                />
              )}
            >
              Discovery Projects
            </TabLink>
            <TabLink
              href={projects.template + projects({}).resourceProjects.template}
              Icon={() => (
                <ResourceProjectIcon
                  color={isResourceActive ? neutral1000.rgb : neutral900.rgb}
                />
              )}
            >
              Resource Projects
            </TabLink>
            <TabLink
              href={projects.template + projects({}).traineeProjects.template}
              Icon={() => (
                <TraineeProjectIcon
                  color={isTraineeActive ? neutral1000.rgb : neutral900.rgb}
                />
              )}
            >
              Trainee Projects
            </TabLink>
          </TabNav>
        }
      >
        <div>
          <Display styleAsHeading={2}>Projects</Display>
          <Paragraph accent="neutral900" styles={descriptionStyles}>
            Projects are targeted efforts that translate recommendations into
            action to advance the PD field. They address critical research
            needs, drive discovery, or produce shared resources, often with
            dedicated funding and support.
          </Paragraph>
        </div>
      </PageInfoContainer>
      {showSearch && (
        <PageConstraints noPaddingBottom>
          <Paragraph accent="neutral900" styles={projectTypeDescriptionStyles}>
            {projectDescriptions[page]}
          </Paragraph>
          <SearchAndFilter
            onChangeSearch={onChangeSearchQuery}
            searchQuery={searchQuery}
            onChangeFilter={onChangeFilter}
            filters={filters}
            filterOptions={filterOptions}
            searchPlaceholder="Enter project name, keyword, …"
          />
        </PageConstraints>
      )}
    </header>
  );
};

export default ProjectsPageHeader;
