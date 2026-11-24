import { ComponentProps } from 'react';

import ProjectsPageHeader from './ProjectsPageHeader';
import PageConstraints from './PageConstraints';

const ProjectsPage: React.FC<
  ComponentProps<typeof ProjectsPageHeader> & { children?: React.ReactNode }
> = ({ children, ...props }) => (
  <article>
    <ProjectsPageHeader {...props} />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default ProjectsPage;
