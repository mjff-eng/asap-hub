import { getGraphQLClient as getContentfulGraphQLClient } from '@asap-hub/contentful';
import { CalendarDataProvider, UserResponse } from '@asap-hub/model';
import {
  addUserIdProp,
  AuthHandler,
  authHandlerFactory,
  decodeTokenFactory,
  errorHandlerFactory,
  getHttpLogger,
  AlertsSentry,
  HttpLogger,
  Logger,
  MemoryCacheClient,
  permissionHandler,
  redaction,
  sentryTransactionIdMiddleware,
  shouldHandleError,
} from '@asap-hub/server-common';

import * as Sentry from '@sentry/serverless';
import cors from 'cors';
import express, { Express, RequestHandler } from 'express';
import 'express-async-errors';
import {
  auth0Audience,
  contentfulAccessToken,
  contentfulEnvId,
  contentfulPreviewAccessToken,
  contentfulSpaceId,
} from './config';
import AimController from './controllers/aim.controller';
import AnalyticsController from './controllers/analytics.controller';
import CalendarController from './controllers/calendar.controller';
import CategoryController from './controllers/category.controller';
import ComplianceReportController from './controllers/compliance-report.controller';
import ContentGeneratorController from './controllers/content-generator.controller';
import DashboardController from './controllers/dashboard.controller';
import DiscoverController from './controllers/discover.controller';
import DiscussionController from './controllers/discussion.controller';
import EventController from './controllers/event.controller';
import GuideController from './controllers/guide.controller';
import ImpactController from './controllers/impact.controller';
import InterestGroupController from './controllers/interest-group.controller';
import LabController from './controllers/lab.controller';
import ManuscriptController from './controllers/manuscript.controller';
import MilestoneController from './controllers/milestone.controller';
import NewsController from './controllers/news.controller';
import ProjectController from './controllers/project.controller';
import PageController from './controllers/page.controller';
import ReminderController from './controllers/reminder.controller';
import ResearchOutputController from './controllers/research-output.controller';
import ResearchTagController from './controllers/research-tag.controller';
import ResearchThemeController from './controllers/research-theme.controller';
import ResourceTypeController from './controllers/resource-type.controller';
import TeamController from './controllers/team.controller';
import TutorialController from './controllers/tutorial.controller';
import UserController from './controllers/user.controller';
import WorkingGroupController from './controllers/working-group.controller';
import { AssetContentfulDataProvider } from './data-providers/contentful/asset.data-provider';
import { CalendarContentfulDataProvider } from './data-providers/contentful/calendar.data-provider';
import { CategoryContentfulDataProvider } from './data-providers/contentful/category.data-provider';
import { ComplianceReportContentfulDataProvider } from './data-providers/contentful/compliance-report.data-provider';
import { DashboardContentfulDataProvider } from './data-providers/contentful/dashboard.data-provider';
import { DiscoverContentfulDataProvider } from './data-providers/contentful/discover.data-provider';
import { DiscussionContentfulDataProvider } from './data-providers/contentful/discussion.data-provider';
import { EventContentfulDataProvider } from './data-providers/contentful/event.data-provider';
import { ExternalAuthorContentfulDataProvider } from './data-providers/contentful/external-author.data-provider';
import { ImpactContentfulDataProvider } from './data-providers/contentful/impact.data-provider';
import { InterestGroupContentfulDataProvider } from './data-providers/contentful/interest-group.data-provider';
import { LabContentfulDataProvider } from './data-providers/contentful/lab.data-provider';
import { ManuscriptContentfulDataProvider } from './data-providers/contentful/manuscript.data-provider';
import { NewsContentfulDataProvider } from './data-providers/contentful/news.data-provider';
import { PageContentfulDataProvider } from './data-providers/contentful/page.data-provider';
import { ReminderContentfulDataProvider } from './data-providers/contentful/reminder.data-provider';
import { ResearchOutputContentfulDataProvider } from './data-providers/contentful/research-output.data-provider';
import { ResearchTagContentfulDataProvider } from './data-providers/contentful/research-tag.data-provider';
import { ResearchThemeContentfulDataProvider } from './data-providers/contentful/research-theme.data-provider';
import { ResourceTypeContentfulDataProvider } from './data-providers/contentful/resource-type.data-provider';
import { TeamContentfulDataProvider } from './data-providers/contentful/team.data-provider';
import { TutorialContentfulDataProvider } from './data-providers/contentful/tutorial.data-provider';
import { UserContentfulDataProvider } from './data-providers/contentful/user.data-provider';
import { WorkingGroupContentfulDataProvider } from './data-providers/contentful/working-group.data-provider';
import { AimsMilestonesContentfulDataProvider } from './data-providers/contentful/aims-milestones.data-provider';
import { ProjectContentfulDataProvider } from './data-providers/contentful/project.data-provider';

import { GuideContentfulDataProvider } from './data-providers/contentful/guide.data-provider';
import {
  AimsMilestonesDataProvider,
  AssetDataProvider,
  CategoryDataProvider,
  ComplianceReportDataProvider,
  DashboardDataProvider,
  DiscoverDataProvider,
  DiscussionDataProvider,
  EventDataProvider,
  GuideDataProvider,
  ImpactDataProvider,
  InterestGroupDataProvider,
  LabDataProvider,
  ManuscriptDataProvider,
  NewsDataProvider,
  PageDataProvider,
  ReminderDataProvider,
  ResearchOutputDataProvider,
  ResearchTagDataProvider,
  ResearchThemeDataProvider,
  ResourceTypeDataProvider,
  TutorialDataProvider,
  UserDataProvider,
  WorkingGroupDataProvider,
} from './data-providers/types';
import { ProjectDataProvider } from './data-providers/types/projects.data-provider.types';
import { getContentfulRestClientFactory } from './dependencies/clients.dependencies';
import { featureFlagMiddlewareFactory } from './middleware/feature-flag';
import { aimRouteFactory } from './routes/aim.route';
import { analyticsRouteFactory } from './routes/analytics.route';
import { calendarRouteFactory } from './routes/calendar.route';
import { categoryRouteFactory } from './routes/category.routes';
import { complianceReportRouteFactory } from './routes/compliance-report.route';
import { contentGeneratorRouteFactory } from './routes/content-generator.route';
import { dashboardRouteFactory } from './routes/dashboard.route';
import { discoverRouteFactory } from './routes/discover.route';
import { discussionRouteFactory } from './routes/discussion.route';
import { eventRouteFactory } from './routes/event.route';
import { guideRouteFactory } from './routes/guide.route';
import { impactRouteFactory } from './routes/impact.route';
import { interestGroupRouteFactory } from './routes/interest-group.route';
import { labRouteFactory } from './routes/lab.route';
import { manuscriptRouteFactory } from './routes/manuscript.route';
import { milestoneRouteFactory } from './routes/milestone.route';
import { newsRouteFactory } from './routes/news.route';
import { pageRouteFactory } from './routes/page.route';
import { reminderRouteFactory } from './routes/reminder.route';
import { researchOutputRouteFactory } from './routes/research-output.route';
import { researchTagRouteFactory } from './routes/research-tag.route';
import { researchThemeRouteFactory } from './routes/research-theme.route';
import { resourceTypeRouteFactory } from './routes/resource-type.route';
import { projectRouteFactory } from './routes/project.route';
import { teamRouteFactory } from './routes/team.route';
import { tutorialRouteFactory } from './routes/tutorial.route';
import { userPublicRouteFactory, userRouteFactory } from './routes/user.route';
import { workingGroupRouteFactory } from './routes/working-group.route';
import assignUserToContext from './utils/assign-user-to-context';
import { FeatureFlagDependencySwitch } from './utils/feature-flag';
import pinoLogger from './utils/logger';
import { ExternalAuthorDataProvider } from './data-providers/types/external-authors.data-provider.types';
import { TeamDataProvider } from './data-providers/types/teams.data-provider.types';
import { AnalyticsContentfulDataProvider } from './data-providers/contentful/analytics.data-provider';
import { GenerativeContentDataProvider } from './data-providers/contentful/generative-content.data-provider';
import { fileRouteFactory } from './routes/files.route';
import FilesController from './controllers/files.controller';
import FileProvider from './data-providers/file-provider';
import OpensearchController from './controllers/opensearch.controller';
import OpensearchDataProvider from './data-providers/opensearch.data-provider';
import { opensearchRouteFactory } from './routes/opensearch.route';

export const appFactory = (libs: Libs = {}): Express => {
  const app = express();

  const contentfulGraphQLClient = getContentfulGraphQLClient({
    space: contentfulSpaceId,
    accessToken: contentfulAccessToken,
    environment: contentfulEnvId,
  });

  const contentfulPreviewGraphQLClient = getContentfulGraphQLClient({
    space: contentfulSpaceId,
    accessToken: contentfulPreviewAccessToken,
    environment: contentfulEnvId,
  });

  /**
   * Dependency Injection -->
   */
  // Libs
  const logger = libs.logger || pinoLogger;
  const featureFlagDependencySwitch = new FeatureFlagDependencySwitch();
  // Middleware
  const httpLogger =
    libs.httpLogger ||
    getHttpLogger({
      logger,
      customProps: addUserIdProp,
      serializers: redaction,
    });
  const errorHandler = errorHandlerFactory(logger);

  // Clients
  const decodeToken = decodeTokenFactory(auth0Audience);
  const userResponseCacheClient = new MemoryCacheClient<UserResponse>();

  // Data Providers
  const analyticsDataProvider =
    libs.analyticsDataProvider ||
    new AnalyticsContentfulDataProvider(contentfulGraphQLClient);
  const dashboardDataProvider =
    libs.dashboardDataProvider ||
    new DashboardContentfulDataProvider(contentfulGraphQLClient);

  const newsDataProvider =
    libs.newsDataProvider ||
    new NewsContentfulDataProvider(contentfulGraphQLClient);

  const pageDataProvider =
    libs.pageDataProvider ||
    new PageContentfulDataProvider(contentfulGraphQLClient);

  const teamDataProvider =
    libs.teamDataProvider ||
    new TeamContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const userDataProvider =
    libs.userDataProvider ||
    new UserContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );
  const assetDataProvider =
    libs.assetDataProvider ||
    new AssetContentfulDataProvider(getContentfulRestClientFactory);

  const interestGroupDataProvider =
    libs.interestGroupDataProvider ||
    new InterestGroupContentfulDataProvider(contentfulGraphQLClient);

  const reminderDataProvider =
    libs.reminderDataProvider ||
    new ReminderContentfulDataProvider(
      contentfulPreviewGraphQLClient,
      new AlertsSentry(Sentry.captureException.bind(Sentry)),
    );

  const externalAuthorDataProvider =
    libs.externalAuthorDataProvider ||
    new ExternalAuthorContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const categoryDataProvider =
    libs.categoryDataProvider ||
    new CategoryContentfulDataProvider(contentfulGraphQLClient);

  const impactDataProvider =
    libs.impactDataProvider ||
    new ImpactContentfulDataProvider(contentfulGraphQLClient);

  const calendarDataProvider =
    libs.calendarDataProvider ||
    new CalendarContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const complianceReportDataProvider =
    libs.complianceReportDataProvider ||
    new ComplianceReportContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const workingGroupDataProvider =
    libs.workingGroupDataProvider ||
    new WorkingGroupContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const eventDataProvider =
    libs.eventDataProvider ||
    new EventContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const tutorialDataProvider =
    libs.tutorialDataProvider ||
    new TutorialContentfulDataProvider(contentfulGraphQLClient);

  const discoverDataProvider =
    libs.discoverDataProvider ||
    new DiscoverContentfulDataProvider(contentfulGraphQLClient);

  const discussionDataProvider =
    libs.discussionDataProvider ||
    new DiscussionContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const guideDataProvider =
    libs.guideDataProvider ||
    new GuideContentfulDataProvider(contentfulGraphQLClient);

  const researchTagDataProvider =
    libs.researchTagDataProvider ||
    new ResearchTagContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const researchThemeDataProvider =
    libs.researchThemeDataProvider ||
    new ResearchThemeContentfulDataProvider(contentfulGraphQLClient);

  const resourceTypeDataProvider =
    libs.resourceTypeDataProvider ||
    new ResourceTypeContentfulDataProvider(contentfulGraphQLClient);

  const researchOutputDataProvider =
    libs.researchOutputDataProvider ||
    new ResearchOutputContentfulDataProvider(
      contentfulGraphQLClient,
      contentfulPreviewGraphQLClient,
      getContentfulRestClientFactory,
    );

  const aimsMilestonesDataProvider =
    libs.aimsMilestonesDataProvider ||
    new AimsMilestonesContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const opensearchProvider =
    libs.opensearchProvider || new OpensearchDataProvider();

  const projectDataProvider =
    libs.projectDataProvider ||
    new ProjectContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
      opensearchProvider,
    );

  const labDataProvider =
    libs.labDataProvider ||
    new LabContentfulDataProvider(contentfulGraphQLClient);

  const manuscriptDataProvider =
    libs.manuscriptDataProvider ||
    new ManuscriptContentfulDataProvider(
      contentfulGraphQLClient,
      getContentfulRestClientFactory,
    );

  const generativeContentDataProvider = new GenerativeContentDataProvider();

  // Controllers
  const aimController =
    libs.aimController || new AimController(aimsMilestonesDataProvider);
  const analyticsController =
    libs.analyticsController || new AnalyticsController(analyticsDataProvider);
  const calendarController =
    libs.calendarController || new CalendarController(calendarDataProvider);
  const categoryController =
    libs.categoryController || new CategoryController(categoryDataProvider);
  const complianceReportController =
    libs.complianceReportController ||
    new ComplianceReportController(complianceReportDataProvider);
  const contentGeneratorController =
    libs.contentGeneratorController ||
    new ContentGeneratorController(generativeContentDataProvider);
  const dashboardController =
    libs.dashboardController || new DashboardController(dashboardDataProvider);
  const newsController =
    libs.newsController || new NewsController(newsDataProvider);
  const projectController =
    libs.projectController || new ProjectController(projectDataProvider);
  const discoverController =
    libs.discoverController || new DiscoverController(discoverDataProvider);
  const discussionController =
    libs.discussionController ||
    new DiscussionController(discussionDataProvider);
  const eventController =
    libs.eventController || new EventController(eventDataProvider);
  const guideController =
    libs.guideController || new GuideController(guideDataProvider);
  const impactController =
    libs.impactController || new ImpactController(impactDataProvider);
  const interestGroupController =
    libs.interestGroupController ||
    new InterestGroupController(interestGroupDataProvider, userDataProvider);
  const milestoneController =
    libs.milestoneController ||
    new MilestoneController(aimsMilestonesDataProvider);
  const pageController =
    libs.pageController || new PageController(pageDataProvider);
  const reminderController =
    libs.reminderController || new ReminderController(reminderDataProvider);
  const researchOutputController =
    libs.researchOutputController ||
    new ResearchOutputController(
      researchOutputDataProvider,
      researchTagDataProvider,
      externalAuthorDataProvider,
    );
  const researchTagController =
    libs.researchTagController ||
    new ResearchTagController(researchTagDataProvider);
  const researchThemeController =
    libs.researchThemeController ||
    new ResearchThemeController(researchThemeDataProvider);
  const resourceTypeController =
    libs.resourceTypeController ||
    new ResourceTypeController(resourceTypeDataProvider);
  const teamController =
    libs.teamController || new TeamController(teamDataProvider);
  const tutorialsController =
    libs.tutorialsController || new TutorialController(tutorialDataProvider);
  const userController =
    libs.userController ||
    new UserController(
      userDataProvider,
      assetDataProvider,
      researchTagDataProvider,
    );
  const labController =
    libs.labController || new LabController(labDataProvider);
  const manuscriptController =
    libs.manuscriptController ||
    new ManuscriptController(
      manuscriptDataProvider,
      externalAuthorDataProvider,
      assetDataProvider,
    );
  const workingGroupsController =
    libs.workingGroupController ||
    new WorkingGroupController(workingGroupDataProvider);
  const filesController =
    libs.filesController || new FilesController(new FileProvider());
  const opensearchController =
    libs.opensearchController || new OpensearchController(opensearchProvider);

  // Handlers
  const authHandler =
    libs.authHandler ||
    authHandlerFactory<UserResponse>(
      decodeToken,
      userController.fetchByCode.bind(userController),
      userResponseCacheClient,
      logger,
      assignUserToContext,
    );
  const sentryTransactionIdHandler =
    libs.sentryTransactionIdHandler || sentryTransactionIdMiddleware;

  // Routes
  const aimRoutes = aimRouteFactory(aimController);
  const analyticsRoutes = analyticsRouteFactory(analyticsController);
  const calendarRoutes = calendarRouteFactory(calendarController);
  const categoryRoutes = categoryRouteFactory(categoryController);
  const complianceReportRoutes = complianceReportRouteFactory(
    complianceReportController,
    manuscriptController,
  );
  const contentGeneratorRoutes = contentGeneratorRouteFactory(
    contentGeneratorController,
  );
  const dashboardRoutes = dashboardRouteFactory(dashboardController);
  const discoverRoutes = discoverRouteFactory(discoverController);
  const discussionRoutes = discussionRouteFactory(
    discussionController,
    manuscriptController,
  );
  const guideRoutes = guideRouteFactory(guideController);
  const eventRoutes = eventRouteFactory(eventController);
  const impactRoutes = impactRouteFactory(impactController);
  const interestGroupRoutes = interestGroupRouteFactory(
    interestGroupController,
    eventController,
  );
  const labRoutes = labRouteFactory(labController);
  const manuscriptRoutes = manuscriptRouteFactory(manuscriptController);
  const milestoneRoutes = milestoneRouteFactory(
    milestoneController,
    projectController,
  );
  const newsRoutes = newsRouteFactory(newsController);
  const projectRoutes = projectRouteFactory(projectController);
  const opensearchRoutes = opensearchRouteFactory(opensearchController);
  const pageRoutes = pageRouteFactory(pageController);
  const reminderRoutes = reminderRouteFactory(reminderController);
  const researchOutputRoutes = researchOutputRouteFactory(
    researchOutputController,
    manuscriptController,
    projectController,
    teamController,
  );
  const researchTagRoutes = researchTagRouteFactory(researchTagController);
  const researchThemeRoutes = researchThemeRouteFactory(
    researchThemeController,
  );
  const resourceTypeRoutes = resourceTypeRouteFactory(resourceTypeController);
  const teamRoutes = teamRouteFactory(interestGroupController, teamController);
  const tutorialRoutes = tutorialRouteFactory(tutorialsController);
  const userPublicRoutes = userPublicRouteFactory(userController);
  const userRoutes = userRouteFactory(userController, interestGroupController);
  const workingGroupRoutes = workingGroupRouteFactory(workingGroupsController);

  const fileRoutes = fileRouteFactory(filesController);

  /**
   * --- end of dependency inection
   */

  /* istanbul ignore next */
  if (libs.sentryRequestHandler) {
    app.use(libs.sentryRequestHandler());
  }
  app.use(httpLogger);
  app.use(sentryTransactionIdHandler);
  app.use(cors());
  app.use(express.json({ limit: '10MB' }));
  app.use(featureFlagMiddlewareFactory(featureFlagDependencySwitch));

  /**
   * Public routes --->
   */
  app.use(pageRoutes);
  app.use(userPublicRoutes);

  /**
   * --- end of public routes
   */

  // Auth
  app.use(authHandler);

  /**
   * Routes requiring authentication below
   */
  if (libs.mockRequestHandlers) {
    app.use(libs.mockRequestHandlers);
  }

  app.use(userRoutes);
  app.use(researchTagRoutes);
  app.use(researchThemeRoutes);
  app.use(resourceTypeRoutes);

  // Permission check
  app.use(permissionHandler);

  /**
   * Routes requiring onboarding below
   */
  app.use(analyticsRoutes);
  app.use(calendarRoutes);
  app.use(categoryRoutes);
  app.use(complianceReportRoutes);
  app.use(contentGeneratorRoutes);
  app.use(dashboardRoutes);
  app.use(discoverRoutes);
  app.use(discussionRoutes);
  app.use(guideRoutes);
  app.use(eventRoutes);
  app.use(impactRoutes);
  app.use(fileRoutes);
  app.use(interestGroupRoutes);
  app.use(labRoutes);
  app.use(manuscriptRoutes);
  app.use(milestoneRoutes);
  app.use(newsRoutes);
  app.use(projectRoutes);
  app.use(aimRoutes);
  app.use(opensearchRoutes);
  app.use(reminderRoutes);
  app.use(researchOutputRoutes);
  app.use(teamRoutes);
  app.use(tutorialRoutes);
  app.use(workingGroupRoutes);

  app.get('*', async (_req, res) => {
    res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });

  /* istanbul ignore next */
  if (libs.sentryErrorHandler) {
    app.use(libs.sentryErrorHandler({ shouldHandleError }));
  }

  app.use(errorHandler);
  app.disable('x-powered-by');

  return app;
};

export type Libs = {
  aimController?: AimController;
  aimsMilestonesDataProvider?: AimsMilestonesDataProvider;
  analyticsDataProvider?: AnalyticsContentfulDataProvider;
  analyticsController?: AnalyticsController;
  calendarController?: CalendarController;
  categoryController?: CategoryController;
  complianceReportController?: ComplianceReportController;
  contentGeneratorController?: ContentGeneratorController;
  dashboardController?: DashboardController;
  discoverController?: DiscoverController;
  discussionController?: DiscussionController;
  guideController?: GuideController;
  eventController?: EventController;
  impactController?: ImpactController;
  interestGroupController?: InterestGroupController;
  filesController?: FilesController;
  labController?: LabController;
  manuscriptController?: ManuscriptController;
  milestoneController?: MilestoneController;
  newsController?: NewsController;
  projectController?: ProjectController;
  pageController?: PageController;
  reminderController?: ReminderController;
  researchOutputController?: ResearchOutputController;
  researchTagController?: ResearchTagController;
  researchThemeController?: ResearchThemeController;
  resourceTypeController?: ResourceTypeController;
  teamController?: TeamController;
  tutorialsController?: TutorialController;
  userController?: UserController;
  workingGroupController?: WorkingGroupController;
  assetDataProvider?: AssetDataProvider;
  categoryDataProvider?: CategoryDataProvider;
  calendarDataProvider?: CalendarDataProvider;
  complianceReportDataProvider?: ComplianceReportDataProvider;
  dashboardDataProvider?: DashboardDataProvider;
  discoverDataProvider?: DiscoverDataProvider;
  discussionDataProvider?: DiscussionDataProvider;
  guideDataProvider?: GuideDataProvider;
  impactDataProvider?: ImpactDataProvider;
  externalAuthorDataProvider?: ExternalAuthorDataProvider;
  interestGroupDataProvider?: InterestGroupDataProvider;
  labDataProvider?: LabDataProvider;
  manuscriptDataProvider?: ManuscriptDataProvider;
  newsDataProvider?: NewsDataProvider;
  projectDataProvider?: ProjectDataProvider;
  pageDataProvider?: PageDataProvider;
  reminderDataProvider?: ReminderDataProvider;
  researchOutputDataProvider?: ResearchOutputDataProvider;
  researchTagDataProvider?: ResearchTagDataProvider;
  researchThemeDataProvider?: ResearchThemeDataProvider;
  resourceTypeDataProvider?: ResourceTypeDataProvider;
  teamDataProvider?: TeamDataProvider;
  tutorialDataProvider?: TutorialDataProvider;
  userDataProvider?: UserDataProvider;
  eventDataProvider?: EventDataProvider;
  workingGroupDataProvider?: WorkingGroupDataProvider;
  authHandler?: AuthHandler;
  httpLogger?: HttpLogger;
  logger?: Logger;
  sentryErrorHandler?: typeof Sentry.Handlers.errorHandler;
  sentryRequestHandler?: typeof Sentry.Handlers.requestHandler;
  sentryTransactionIdHandler?: RequestHandler;
  // extra handlers only for tests and local development
  mockRequestHandlers?: RequestHandler[];
  opensearchController?: OpensearchController;
  opensearchProvider?: OpensearchDataProvider;
};
