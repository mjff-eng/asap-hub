/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel-plugin for production.
 */
const documents = {
  '\n  fragment AnnouncementsContentData on Announcements {\n    sys {\n      id\n    }\n    description\n    deadline\n    link\n  }\n':
    types.AnnouncementsContentDataFragmentDoc,
  '\n  query FetchAnnouncements($limit: Int) {\n    announcementsCollection(limit: $limit) {\n      total\n      items {\n        ...AnnouncementsContentData\n      }\n    }\n  }\n  \n':
    types.FetchAnnouncementsDocument,
  '\n  fragment CalendarsContentData on Calendars {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    googleCalendarId\n    name\n    color\n    googleApiMetadata\n    linkedFrom {\n      projectsCollection {\n        items {\n          sys {\n            id\n          }\n          title\n          status\n        }\n      }\n      workingGroupsCollection {\n        items {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n  }\n':
    types.CalendarsContentDataFragmentDoc,
  '\n  query FetchCalendarById($id: String!) {\n    calendars(id: $id) {\n      ...CalendarsContentData\n    }\n  }\n  \n':
    types.FetchCalendarByIdDocument,
  '\n  query FetchCalendars(\n    $limit: Int\n    $skip: Int\n    $order: [CalendarsOrder]\n    $where: CalendarsFilter\n  ) {\n    calendarsCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n    ) {\n      total\n      items {\n        ...CalendarsContentData\n      }\n    }\n  }\n  \n':
    types.FetchCalendarsDocument,
  '\n  fragment ContributingCohortsContentData on ContributingCohorts {\n    sys {\n      id\n    }\n    name\n    studyLink\n  }\n':
    types.ContributingCohortsContentDataFragmentDoc,
  '\n  query FetchContributingCohorts(\n    $limit: Int\n    $skip: Int\n    $order: [ContributingCohortsOrder]\n  ) {\n    contributingCohortsCollection(limit: $limit, skip: $skip, order: $order) {\n      total\n      items {\n        ...ContributingCohortsContentData\n      }\n    }\n  }\n  \n':
    types.FetchContributingCohortsDocument,
  '\n  query FetchDashboard(\n    $orderAnnouncements: [DashboardAnnouncementsCollectionOrder]\n  ) {\n    dashboardCollection(limit: 1) {\n      total\n      items {\n        latestStats {\n          sampleCount\n          articleCount\n          cohortCount\n        }\n        announcementsCollection(order: $orderAnnouncements) {\n          items {\n            description\n            deadline\n            link\n            sys {\n              id\n            }\n          }\n        }\n        guidesCollection {\n          items {\n            sys {\n              id\n            }\n            title\n            icon {\n              url\n            }\n            descriptionCollection {\n              items {\n                sys {\n                  id\n                }\n                title\n                bodyText\n                linkUrl\n                linkText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n':
    types.FetchDashboardDocument,
  '\n  fragment EventsContentData on Events {\n    sys {\n      id\n      publishedAt\n      publishedVersion\n    }\n    description\n    endDate\n    endDateTimeZone\n    startDate\n    startDateTimeZone\n    meetingLink\n    hideMeetingLink\n    eventLink\n    status\n    hidden\n    googleId\n    copyMeetingLink\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    title\n    notesPermanentlyUnavailable\n    notes {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    notesUpdatedAt\n    videoRecordingPermanentlyUnavailable\n    videoRecording {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    videoRecordingUpdatedAt\n    presentationPermanentlyUnavailable\n    presentation {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    presentationUpdatedAt\n    meetingMaterialsPermanentlyUnavailable\n    meetingMaterials\n    calendar {\n      googleCalendarId\n      color\n      name\n      linkedFrom {\n        workingGroupsCollection {\n          items {\n            sys {\n              id\n            }\n            title\n          }\n        }\n        projectsCollection {\n          items {\n            sys {\n              id\n            }\n            title\n            status\n          }\n        }\n      }\n    }\n    thumbnail {\n      url\n    }\n    speakersCollection(limit: 10) {\n      items {\n        title\n        user {\n          __typename\n          ... on ExternalUsers {\n            sys {\n              id\n            }\n            name\n            orcid\n          }\n          ... on Users {\n            sys {\n              id\n            }\n            firstName\n            nickname\n            lastName\n            onboarded\n            alumniSinceDate\n            avatar {\n              url\n            }\n          }\n        }\n      }\n    }\n    linkedFrom {\n      outputsCollection(limit: 50, order: [addedDate_ASC]) {\n        items {\n          ...RelatedOutputData\n        }\n      }\n    }\n  }\n  \n':
    types.EventsContentDataFragmentDoc,
  '\n  query FetchEventById($id: String!) {\n    events(id: $id) {\n      ...EventsContentData\n    }\n  }\n  \n':
    types.FetchEventByIdDocument,
  '\n  query FetchEvents(\n    $limit: Int\n    $skip: Int\n    $order: [EventsOrder]\n    $where: EventsFilter\n  ) {\n    eventsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...EventsContentData\n      }\n    }\n  }\n  \n':
    types.FetchEventsDocument,
  '\n  query FetchEventsByUserId($id: String!, $limit: Int, $skip: Int) {\n    users(id: $id) {\n      linkedFrom {\n        eventSpeakersCollection(limit: 1) {\n          items {\n            linkedFrom {\n              eventsCollection(limit: $limit, skip: $skip) {\n                total\n                items {\n                  ...EventsContentData\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchEventsByUserIdDocument,
  '\n  query FetchEventsByExternalUserId($id: String!, $limit: Int, $skip: Int) {\n    externalUsers(id: $id) {\n      linkedFrom {\n        eventSpeakersCollection(limit: 1) {\n          items {\n            linkedFrom {\n              eventsCollection(limit: $limit, skip: $skip) {\n                total\n                items {\n                  ...EventsContentData\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchEventsByExternalUserIdDocument,
  '\n  query FetchProjectCalendar($id: String!) {\n    projects(id: $id) {\n      calendar {\n        sys {\n          id\n        }\n      }\n    }\n  }\n':
    types.FetchProjectCalendarDocument,
  '\n  query FetchWorkingGroupCalendar($id: String!) {\n    workingGroups(id: $id) {\n      calendar {\n        sys {\n          id\n        }\n      }\n    }\n  }\n':
    types.FetchWorkingGroupCalendarDocument,
  '\n  fragment ExternalUsersContentData on ExternalUsers {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    name\n    orcid\n  }\n':
    types.ExternalUsersContentDataFragmentDoc,
  '\n  query FetchExternalUsers(\n    $limit: Int\n    $skip: Int\n    $order: [ExternalUsersOrder]\n    $where: ExternalUsersFilter\n  ) {\n    externalUsersCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n    ) {\n      total\n      items {\n        ...ExternalUsersContentData\n      }\n    }\n  }\n  \n':
    types.FetchExternalUsersDocument,
  '\n  query FetchExternalUserById($id: String!) {\n    externalUsers(id: $id) {\n      ...ExternalUsersContentData\n    }\n  }\n  \n':
    types.FetchExternalUserByIdDocument,
  '\n  fragment NewsContentData on News {\n    sys {\n      id\n      firstPublishedAt\n    }\n    title\n    shortText\n    thumbnail {\n      url\n    }\n    tagsCollection(limit: 20) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    link\n    linkText\n    publishDate\n    type\n  }\n':
    types.NewsContentDataFragmentDoc,
  '\n  query FetchNewsById($id: String!) {\n    news(id: $id) {\n      ...NewsContentData\n    }\n  }\n  \n':
    types.FetchNewsByIdDocument,
  '\n  query FetchNews(\n    $limit: Int\n    $skip: Int\n    $order: [NewsOrder]\n    $where: NewsFilter\n  ) {\n    newsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...NewsContentData\n      }\n    }\n  }\n  \n':
    types.FetchNewsDocument,
  '\n  fragment RelatedOutputData on Outputs {\n    sys {\n      id\n    }\n    title\n    documentType\n    type\n    relatedEntitiesCollection(limit: 1) {\n      items {\n        __typename\n        ... on WorkingGroups {\n          sys {\n            id\n          }\n          title\n        }\n        ... on Projects {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n  }\n':
    types.RelatedOutputDataFragmentDoc,
  '\n  fragment OutputsContentData on Outputs {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    documentType\n    type\n    subtype\n    description\n    shortDescription\n    gp2Supported\n    sharingStatus\n    link\n    addedDate\n    publishDate\n    lastUpdatedPartial\n    authorsCollection(limit: 10) {\n      total\n      items {\n        __typename\n        ... on Users {\n          sys {\n            id\n          }\n          firstName\n          nickname\n          lastName\n          email\n          avatar {\n            url\n          }\n          onboarded\n          alumniSinceDate\n        }\n        ... on ExternalUsers {\n          sys {\n            id\n          }\n          name\n        }\n      }\n    }\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    relatedOutputsCollection(limit: 10) {\n      items {\n        ...RelatedOutputData\n      }\n    }\n    linkedFrom {\n      outputsCollection(limit: 50, order: [addedDate_ASC]) {\n        items {\n          ...RelatedOutputData\n        }\n      }\n    }\n    relatedEventsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        title\n        endDate\n      }\n    }\n    doi\n    rrid\n    accessionNumber\n    relatedEntitiesCollection {\n      total\n      items {\n        __typename\n        ... on Projects {\n          sys {\n            id\n          }\n          title\n        }\n        ... on WorkingGroups {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n    contributingCohortsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n        studyLink\n      }\n    }\n    versionsCollection {\n      total\n      items {\n        sys {\n          id\n        }\n        title\n        documentType\n        type\n        addedDate\n        link\n        rrid\n        accessionNumber\n        doi\n      }\n    }\n  }\n  \n':
    types.OutputsContentDataFragmentDoc,
  '\n  query FetchOutputById($id: String!) {\n    outputs(id: $id) {\n      ...OutputsContentData\n    }\n  }\n  \n':
    types.FetchOutputByIdDocument,
  '\n  query FetchOutputs(\n    $limit: Int\n    $skip: Int\n    $order: [OutputsOrder]\n    $where: OutputsFilter\n    $preview: Boolean\n  ) {\n    outputsCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n      preview: $preview\n    ) {\n      total\n      items {\n        ...OutputsContentData\n      }\n    }\n  }\n  \n':
    types.FetchOutputsDocument,
  '\n  query FetchOutputsByWorkingGroupId($id: String!, $limit: Int, $skip: Int) {\n    workingGroups(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchOutputsByWorkingGroupIdDocument,
  '\n  query FetchOutputsByUserId($id: String!, $limit: Int, $skip: Int) {\n    users(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchOutputsByUserIdDocument,
  '\n  query FetchOutputsByExternalUserId($id: String!, $limit: Int, $skip: Int) {\n    externalUsers(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchOutputsByExternalUserIdDocument,
  '\n  query FetchOutputsByProjectId($id: String!, $limit: Int, $skip: Int) {\n    projects(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchOutputsByProjectIdDocument,
  '\n  query FetchOutputsByEventId($id: String!, $limit: Int, $skip: Int) {\n    events(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchOutputsByEventIdDocument,
  '\n  fragment PageContentData on Pages {\n    sys {\n      id\n    }\n    title\n    path\n    shortText\n    text {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    link\n    linkText\n  }\n':
    types.PageContentDataFragmentDoc,
  '\n  query FetchPages($where: PagesFilter) {\n    pagesCollection(limit: 100, where: $where) {\n      total\n      items {\n        ...PageContentData\n      }\n    }\n  }\n  \n':
    types.FetchPagesDocument,
  '\n  fragment ProjectMemberData on ProjectMembership {\n    sys {\n      id\n    }\n    role\n    inactiveSinceDate\n    user {\n      sys {\n        id\n      }\n      firstName\n      nickname\n      lastName\n      onboarded\n      alumniSinceDate\n      avatar {\n        url\n      }\n    }\n  }\n':
    types.ProjectMemberDataFragmentDoc,
  '\n  fragment ProjectsContentFields on Projects {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    startDate\n    endDate\n    status\n    projectProposal\n    description\n    pmEmail\n    leadEmail\n    tagsCollection(limit: 6) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    traineeProject\n    opportunitiesAvailable\n    opportunitiesShortText\n    opportunitiesLinkName\n    opportunitiesLink\n    membersCollection(limit: 100) {\n      total\n      items {\n        ...ProjectMemberData\n      }\n    }\n    milestonesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        description\n        externalLink\n        status\n        title\n      }\n    }\n    resourcesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        type\n        title\n        description\n        externalLink\n      }\n    }\n    calendar {\n      sys {\n        id\n      }\n      name\n    }\n  }\n  \n':
    types.ProjectsContentFieldsFragmentDoc,
  '\n  query FetchProjectById($id: String!) {\n    projects(id: $id) {\n      ...ProjectsContentFields\n    }\n  }\n  \n':
    types.FetchProjectByIdDocument,
  '\n  query FetchProjects($limit: Int, $skip: Int, $where: ProjectsFilter) {\n    projectsCollection(limit: $limit, skip: $skip, where: $where) {\n      total\n      items {\n        ...ProjectsContentFields\n      }\n    }\n  }\n  \n':
    types.FetchProjectsDocument,
  '\n  query FetchProjectsByUser($limit: Int, $skip: Int, $userId: String!) {\n    projectMembershipCollection(\n      limit: $limit\n      skip: $skip\n      where: { user: { sys: { id: $userId } } }\n    ) {\n      total\n      items {\n        linkedFrom {\n          projectsCollection(limit: 1) {\n            total\n            items {\n              ...ProjectsContentFields\n            }\n          }\n        }\n      }\n    }\n  }\n  \n':
    types.FetchProjectsByUserDocument,
  '\n  query FetchProjectMembers($id: String!, $limit: Int!, $skip: Int!) {\n    projects(id: $id) {\n      membersCollection(limit: $limit, skip: $skip) {\n        total\n        items {\n          ...ProjectMemberData\n        }\n      }\n    }\n  }\n  \n':
    types.FetchProjectMembersDocument,
  '\n  query FetchReminders(\n    $outputFilter: OutputsFilter\n    $outputVersionFilter: OutputVersionFilter\n    $userId: String!\n  ) {\n    users(id: $userId) {\n      linkedFrom {\n        workingGroupMembershipCollection(limit: 15) {\n          items {\n            linkedFrom {\n              workingGroupsCollection(limit: 1) {\n                items {\n                  sys {\n                    id\n                  }\n                }\n              }\n            }\n          }\n        }\n        projectMembershipCollection(limit: 15) {\n          items {\n            linkedFrom {\n              projectsCollection(limit: 1) {\n                items {\n                  sys {\n                    id\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    outputsCollection(where: $outputFilter) {\n      items {\n        sys {\n          id\n        }\n        title\n        documentType\n        addedDate\n        createdBy {\n          firstName\n          lastName\n        }\n        relatedEntitiesCollection(limit: 1) {\n          items {\n            __typename\n            ... on Projects {\n              sys {\n                id\n              }\n              title\n            }\n            ... on WorkingGroups {\n              sys {\n                id\n              }\n              title\n            }\n          }\n        }\n      }\n    }\n    outputVersionCollection(where: $outputVersionFilter) {\n      items {\n        sys {\n          id\n          publishedAt\n        }\n        linkedFrom {\n          outputsCollection(limit: 1) {\n            items {\n              sys {\n                id\n              }\n              title\n              documentType\n              createdBy {\n                firstName\n                lastName\n              }\n              relatedEntitiesCollection(limit: 1) {\n                items {\n                  __typename\n                  ... on Projects {\n                    sys {\n                      id\n                    }\n                    title\n                  }\n                  ... on WorkingGroups {\n                    sys {\n                      id\n                    }\n                    title\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n':
    types.FetchRemindersDocument,
  '\n  fragment LatestStatsContentData on LatestStats {\n    sampleCount\n    articleCount\n    cohortCount\n  }\n':
    types.LatestStatsContentDataFragmentDoc,
  '\n  query FetchLatestStats {\n    latestStatsCollection(limit: 1) {\n      total\n      items {\n        ...LatestStatsContentData\n      }\n    }\n  }\n  \n':
    types.FetchLatestStatsDocument,
  '\n  fragment TagsContentData on Tags {\n    sys {\n      id\n    }\n    name\n  }\n':
    types.TagsContentDataFragmentDoc,
  '\n  query FetchTags($limit: Int, $order: [TagsOrder]) {\n    tagsCollection(limit: $limit, order: $order) {\n      total\n      items {\n        ...TagsContentData\n      }\n    }\n  }\n  \n':
    types.FetchTagsDocument,
  '\n  fragment UsersContentData on Users {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    activeCampaignId\n    activatedDate\n    firstName\n    middleName\n    lastName\n    nickname\n    avatar {\n      url\n    }\n    degrees\n    country\n    stateOrProvince\n    city\n    region\n    email\n    alternativeEmail\n    telephoneCountryCode\n    telephoneNumber\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    biography\n    questions\n    fundingStreams\n    blog\n    linkedIn\n    blueSky\n    threads\n    twitter\n    github\n    googleScholar\n    orcid\n    orcidLastModifiedDate\n    orcidLastSyncDate\n    orcidWorks\n    researchGate\n    researcherId\n    connections\n    role\n    onboarded\n    alumniSinceDate\n    alumniLocation\n    alumniLastUpdated\n    positions\n    activatedDate\n    contributingCohortsCollection(limit: 10) {\n      items {\n        contributingCohort {\n          sys {\n            id\n          }\n          name\n          studyLink\n        }\n        role\n      }\n    }\n    linkedFrom {\n      projectMembershipCollection(limit: 30) {\n        items {\n          user {\n            sys {\n              id\n            }\n          }\n          role\n          linkedFrom {\n            projectsCollection(limit: 1) {\n              items {\n                sys {\n                  id\n                }\n                title\n                status\n                membersCollection(limit: 25) {\n                  total\n                  items {\n                    role\n                    user {\n                      sys {\n                        id\n                      }\n                      onboarded\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n      workingGroupMembershipCollection(limit: 10) {\n        items {\n          user {\n            sys {\n              id\n            }\n          }\n          role\n          linkedFrom {\n            workingGroupsCollection(limit: 1) {\n              items {\n                sys {\n                  id\n                }\n                title\n                membersCollection(limit: 50) {\n                  total\n                  items {\n                    role\n                    user {\n                      sys {\n                        id\n                      }\n                      onboarded\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n      outputsCollection(limit: 8) {\n        items {\n          sys {\n            id\n          }\n          title\n          shortDescription\n          sharingStatus\n          gp2Supported\n        }\n      }\n    }\n  }\n':
    types.UsersContentDataFragmentDoc,
  '\n  query FetchUserById($id: String!) {\n    users(id: $id) {\n      ...UsersContentData\n    }\n  }\n  \n':
    types.FetchUserByIdDocument,
  '\n  query FetchUsers(\n    $limit: Int\n    $skip: Int\n    $order: [UsersOrder]\n    $where: UsersFilter\n  ) {\n    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...UsersContentData\n      }\n    }\n  }\n  \n':
    types.FetchUsersDocument,
  '\n  query FetchUsersByProjectIds($ids: [String]!) {\n    projectsCollection(limit: 20, where: { sys: { id_in: $ids } }) {\n      total\n      items {\n        sys {\n          id\n        }\n        membersCollection(limit: 25) {\n          total\n          items {\n            user {\n              sys {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n':
    types.FetchUsersByProjectIdsDocument,
  '\n  query FetchUsersByWorkingGroupIds($ids: [String]!) {\n    workingGroupsCollection(limit: 20, where: { sys: { id_in: $ids } }) {\n      total\n      items {\n        sys {\n          id\n        }\n        membersCollection(limit: 50) {\n          total\n          items {\n            user {\n              sys {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n':
    types.FetchUsersByWorkingGroupIdsDocument,
  '\n  query FetchUsersByTagIds($ids: [String]!) {\n    usersCollection(where: { tags: { sys: { id_in: $ids } } }) {\n      total\n      items {\n        sys {\n          id\n        }\n      }\n    }\n  }\n':
    types.FetchUsersByTagIdsDocument,
  '\n  query FetchUsersForOrcidSync(\n    $limit: Int\n    $skip: Int\n    $order: [UsersOrder]\n    $where: UsersFilter\n  ) {\n    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        sys {\n          id\n        }\n        email\n        orcid\n      }\n    }\n  }\n':
    types.FetchUsersForOrcidSyncDocument,
  '\n  fragment WorkingGroupNetworkContentData on WorkingGroupNetwork {\n    supportCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    monogenicCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    operationalCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    complexDiseaseCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n  }\n  \n':
    types.WorkingGroupNetworkContentDataFragmentDoc,
  '\n  query FetchWorkingGroupNetwork {\n    workingGroupNetworkCollection(limit: 1) {\n      total\n      items {\n        ...WorkingGroupNetworkContentData\n      }\n    }\n  }\n  \n':
    types.FetchWorkingGroupNetworkDocument,
  '\n  fragment WorkingGroupMemberData on WorkingGroupMembership {\n    sys {\n      id\n    }\n    role\n    inactiveSinceDate\n    user {\n      sys {\n        id\n      }\n      firstName\n      nickname\n      lastName\n      onboarded\n      alumniSinceDate\n      avatar {\n        url\n      }\n    }\n  }\n':
    types.WorkingGroupMemberDataFragmentDoc,
  '\n  fragment WorkingGroupsContentData on WorkingGroups {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    shortDescription\n    description {\n      json\n    }\n    primaryEmail\n    secondaryEmail\n    leadingMembers\n    membersCollection(limit: 100) {\n      total\n      items {\n        ...WorkingGroupMemberData\n      }\n    }\n    milestonesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        description\n        externalLink\n        status\n        title\n      }\n    }\n    resourcesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        type\n        title\n        description\n        externalLink\n      }\n    }\n    calendar {\n      sys {\n        id\n      }\n      name\n    }\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n  }\n  \n':
    types.WorkingGroupsContentDataFragmentDoc,
  '\n  query FetchWorkingGroupById($id: String!) {\n    workingGroups(id: $id) {\n      ...WorkingGroupsContentData\n    }\n  }\n  \n':
    types.FetchWorkingGroupByIdDocument,
  '\n  query FetchWorkingGroups {\n    workingGroupsCollection(limit: 50) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n  }\n  \n':
    types.FetchWorkingGroupsDocument,
  '\n  query FetchWorkingGroupMembers($id: String!, $limit: Int!, $skip: Int!) {\n    workingGroups(id: $id) {\n      membersCollection(limit: $limit, skip: $skip) {\n        total\n        items {\n          ...WorkingGroupMemberData\n        }\n      }\n    }\n  }\n  \n':
    types.FetchWorkingGroupMembersDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment AnnouncementsContentData on Announcements {\n    sys {\n      id\n    }\n    description\n    deadline\n    link\n  }\n',
): (typeof documents)['\n  fragment AnnouncementsContentData on Announcements {\n    sys {\n      id\n    }\n    description\n    deadline\n    link\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchAnnouncements($limit: Int) {\n    announcementsCollection(limit: $limit) {\n      total\n      items {\n        ...AnnouncementsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchAnnouncements($limit: Int) {\n    announcementsCollection(limit: $limit) {\n      total\n      items {\n        ...AnnouncementsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment CalendarsContentData on Calendars {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    googleCalendarId\n    name\n    color\n    googleApiMetadata\n    linkedFrom {\n      projectsCollection {\n        items {\n          sys {\n            id\n          }\n          title\n          status\n        }\n      }\n      workingGroupsCollection {\n        items {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  fragment CalendarsContentData on Calendars {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    googleCalendarId\n    name\n    color\n    googleApiMetadata\n    linkedFrom {\n      projectsCollection {\n        items {\n          sys {\n            id\n          }\n          title\n          status\n        }\n      }\n      workingGroupsCollection {\n        items {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchCalendarById($id: String!) {\n    calendars(id: $id) {\n      ...CalendarsContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchCalendarById($id: String!) {\n    calendars(id: $id) {\n      ...CalendarsContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchCalendars(\n    $limit: Int\n    $skip: Int\n    $order: [CalendarsOrder]\n    $where: CalendarsFilter\n  ) {\n    calendarsCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n    ) {\n      total\n      items {\n        ...CalendarsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchCalendars(\n    $limit: Int\n    $skip: Int\n    $order: [CalendarsOrder]\n    $where: CalendarsFilter\n  ) {\n    calendarsCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n    ) {\n      total\n      items {\n        ...CalendarsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment ContributingCohortsContentData on ContributingCohorts {\n    sys {\n      id\n    }\n    name\n    studyLink\n  }\n',
): (typeof documents)['\n  fragment ContributingCohortsContentData on ContributingCohorts {\n    sys {\n      id\n    }\n    name\n    studyLink\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchContributingCohorts(\n    $limit: Int\n    $skip: Int\n    $order: [ContributingCohortsOrder]\n  ) {\n    contributingCohortsCollection(limit: $limit, skip: $skip, order: $order) {\n      total\n      items {\n        ...ContributingCohortsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchContributingCohorts(\n    $limit: Int\n    $skip: Int\n    $order: [ContributingCohortsOrder]\n  ) {\n    contributingCohortsCollection(limit: $limit, skip: $skip, order: $order) {\n      total\n      items {\n        ...ContributingCohortsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchDashboard(\n    $orderAnnouncements: [DashboardAnnouncementsCollectionOrder]\n  ) {\n    dashboardCollection(limit: 1) {\n      total\n      items {\n        latestStats {\n          sampleCount\n          articleCount\n          cohortCount\n        }\n        announcementsCollection(order: $orderAnnouncements) {\n          items {\n            description\n            deadline\n            link\n            sys {\n              id\n            }\n          }\n        }\n        guidesCollection {\n          items {\n            sys {\n              id\n            }\n            title\n            icon {\n              url\n            }\n            descriptionCollection {\n              items {\n                sys {\n                  id\n                }\n                title\n                bodyText\n                linkUrl\n                linkText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchDashboard(\n    $orderAnnouncements: [DashboardAnnouncementsCollectionOrder]\n  ) {\n    dashboardCollection(limit: 1) {\n      total\n      items {\n        latestStats {\n          sampleCount\n          articleCount\n          cohortCount\n        }\n        announcementsCollection(order: $orderAnnouncements) {\n          items {\n            description\n            deadline\n            link\n            sys {\n              id\n            }\n          }\n        }\n        guidesCollection {\n          items {\n            sys {\n              id\n            }\n            title\n            icon {\n              url\n            }\n            descriptionCollection {\n              items {\n                sys {\n                  id\n                }\n                title\n                bodyText\n                linkUrl\n                linkText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment EventsContentData on Events {\n    sys {\n      id\n      publishedAt\n      publishedVersion\n    }\n    description\n    endDate\n    endDateTimeZone\n    startDate\n    startDateTimeZone\n    meetingLink\n    hideMeetingLink\n    eventLink\n    status\n    hidden\n    googleId\n    copyMeetingLink\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    title\n    notesPermanentlyUnavailable\n    notes {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    notesUpdatedAt\n    videoRecordingPermanentlyUnavailable\n    videoRecording {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    videoRecordingUpdatedAt\n    presentationPermanentlyUnavailable\n    presentation {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    presentationUpdatedAt\n    meetingMaterialsPermanentlyUnavailable\n    meetingMaterials\n    calendar {\n      googleCalendarId\n      color\n      name\n      linkedFrom {\n        workingGroupsCollection {\n          items {\n            sys {\n              id\n            }\n            title\n          }\n        }\n        projectsCollection {\n          items {\n            sys {\n              id\n            }\n            title\n            status\n          }\n        }\n      }\n    }\n    thumbnail {\n      url\n    }\n    speakersCollection(limit: 10) {\n      items {\n        title\n        user {\n          __typename\n          ... on ExternalUsers {\n            sys {\n              id\n            }\n            name\n            orcid\n          }\n          ... on Users {\n            sys {\n              id\n            }\n            firstName\n            nickname\n            lastName\n            onboarded\n            alumniSinceDate\n            avatar {\n              url\n            }\n          }\n        }\n      }\n    }\n    linkedFrom {\n      outputsCollection(limit: 50, order: [addedDate_ASC]) {\n        items {\n          ...RelatedOutputData\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  fragment EventsContentData on Events {\n    sys {\n      id\n      publishedAt\n      publishedVersion\n    }\n    description\n    endDate\n    endDateTimeZone\n    startDate\n    startDateTimeZone\n    meetingLink\n    hideMeetingLink\n    eventLink\n    status\n    hidden\n    googleId\n    copyMeetingLink\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    title\n    notesPermanentlyUnavailable\n    notes {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    notesUpdatedAt\n    videoRecordingPermanentlyUnavailable\n    videoRecording {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    videoRecordingUpdatedAt\n    presentationPermanentlyUnavailable\n    presentation {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    presentationUpdatedAt\n    meetingMaterialsPermanentlyUnavailable\n    meetingMaterials\n    calendar {\n      googleCalendarId\n      color\n      name\n      linkedFrom {\n        workingGroupsCollection {\n          items {\n            sys {\n              id\n            }\n            title\n          }\n        }\n        projectsCollection {\n          items {\n            sys {\n              id\n            }\n            title\n            status\n          }\n        }\n      }\n    }\n    thumbnail {\n      url\n    }\n    speakersCollection(limit: 10) {\n      items {\n        title\n        user {\n          __typename\n          ... on ExternalUsers {\n            sys {\n              id\n            }\n            name\n            orcid\n          }\n          ... on Users {\n            sys {\n              id\n            }\n            firstName\n            nickname\n            lastName\n            onboarded\n            alumniSinceDate\n            avatar {\n              url\n            }\n          }\n        }\n      }\n    }\n    linkedFrom {\n      outputsCollection(limit: 50, order: [addedDate_ASC]) {\n        items {\n          ...RelatedOutputData\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchEventById($id: String!) {\n    events(id: $id) {\n      ...EventsContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchEventById($id: String!) {\n    events(id: $id) {\n      ...EventsContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchEvents(\n    $limit: Int\n    $skip: Int\n    $order: [EventsOrder]\n    $where: EventsFilter\n  ) {\n    eventsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...EventsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchEvents(\n    $limit: Int\n    $skip: Int\n    $order: [EventsOrder]\n    $where: EventsFilter\n  ) {\n    eventsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...EventsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchEventsByUserId($id: String!, $limit: Int, $skip: Int) {\n    users(id: $id) {\n      linkedFrom {\n        eventSpeakersCollection(limit: 1) {\n          items {\n            linkedFrom {\n              eventsCollection(limit: $limit, skip: $skip) {\n                total\n                items {\n                  ...EventsContentData\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchEventsByUserId($id: String!, $limit: Int, $skip: Int) {\n    users(id: $id) {\n      linkedFrom {\n        eventSpeakersCollection(limit: 1) {\n          items {\n            linkedFrom {\n              eventsCollection(limit: $limit, skip: $skip) {\n                total\n                items {\n                  ...EventsContentData\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchEventsByExternalUserId($id: String!, $limit: Int, $skip: Int) {\n    externalUsers(id: $id) {\n      linkedFrom {\n        eventSpeakersCollection(limit: 1) {\n          items {\n            linkedFrom {\n              eventsCollection(limit: $limit, skip: $skip) {\n                total\n                items {\n                  ...EventsContentData\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchEventsByExternalUserId($id: String!, $limit: Int, $skip: Int) {\n    externalUsers(id: $id) {\n      linkedFrom {\n        eventSpeakersCollection(limit: 1) {\n          items {\n            linkedFrom {\n              eventsCollection(limit: $limit, skip: $skip) {\n                total\n                items {\n                  ...EventsContentData\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchProjectCalendar($id: String!) {\n    projects(id: $id) {\n      calendar {\n        sys {\n          id\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchProjectCalendar($id: String!) {\n    projects(id: $id) {\n      calendar {\n        sys {\n          id\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchWorkingGroupCalendar($id: String!) {\n    workingGroups(id: $id) {\n      calendar {\n        sys {\n          id\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchWorkingGroupCalendar($id: String!) {\n    workingGroups(id: $id) {\n      calendar {\n        sys {\n          id\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment ExternalUsersContentData on ExternalUsers {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    name\n    orcid\n  }\n',
): (typeof documents)['\n  fragment ExternalUsersContentData on ExternalUsers {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    name\n    orcid\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchExternalUsers(\n    $limit: Int\n    $skip: Int\n    $order: [ExternalUsersOrder]\n    $where: ExternalUsersFilter\n  ) {\n    externalUsersCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n    ) {\n      total\n      items {\n        ...ExternalUsersContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchExternalUsers(\n    $limit: Int\n    $skip: Int\n    $order: [ExternalUsersOrder]\n    $where: ExternalUsersFilter\n  ) {\n    externalUsersCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n    ) {\n      total\n      items {\n        ...ExternalUsersContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchExternalUserById($id: String!) {\n    externalUsers(id: $id) {\n      ...ExternalUsersContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchExternalUserById($id: String!) {\n    externalUsers(id: $id) {\n      ...ExternalUsersContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment NewsContentData on News {\n    sys {\n      id\n      firstPublishedAt\n    }\n    title\n    shortText\n    thumbnail {\n      url\n    }\n    tagsCollection(limit: 20) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    link\n    linkText\n    publishDate\n    type\n  }\n',
): (typeof documents)['\n  fragment NewsContentData on News {\n    sys {\n      id\n      firstPublishedAt\n    }\n    title\n    shortText\n    thumbnail {\n      url\n    }\n    tagsCollection(limit: 20) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    link\n    linkText\n    publishDate\n    type\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchNewsById($id: String!) {\n    news(id: $id) {\n      ...NewsContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchNewsById($id: String!) {\n    news(id: $id) {\n      ...NewsContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchNews(\n    $limit: Int\n    $skip: Int\n    $order: [NewsOrder]\n    $where: NewsFilter\n  ) {\n    newsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...NewsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchNews(\n    $limit: Int\n    $skip: Int\n    $order: [NewsOrder]\n    $where: NewsFilter\n  ) {\n    newsCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...NewsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment RelatedOutputData on Outputs {\n    sys {\n      id\n    }\n    title\n    documentType\n    type\n    relatedEntitiesCollection(limit: 1) {\n      items {\n        __typename\n        ... on WorkingGroups {\n          sys {\n            id\n          }\n          title\n        }\n        ... on Projects {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  fragment RelatedOutputData on Outputs {\n    sys {\n      id\n    }\n    title\n    documentType\n    type\n    relatedEntitiesCollection(limit: 1) {\n      items {\n        __typename\n        ... on WorkingGroups {\n          sys {\n            id\n          }\n          title\n        }\n        ... on Projects {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment OutputsContentData on Outputs {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    documentType\n    type\n    subtype\n    description\n    shortDescription\n    gp2Supported\n    sharingStatus\n    link\n    addedDate\n    publishDate\n    lastUpdatedPartial\n    authorsCollection(limit: 10) {\n      total\n      items {\n        __typename\n        ... on Users {\n          sys {\n            id\n          }\n          firstName\n          nickname\n          lastName\n          email\n          avatar {\n            url\n          }\n          onboarded\n          alumniSinceDate\n        }\n        ... on ExternalUsers {\n          sys {\n            id\n          }\n          name\n        }\n      }\n    }\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    relatedOutputsCollection(limit: 10) {\n      items {\n        ...RelatedOutputData\n      }\n    }\n    linkedFrom {\n      outputsCollection(limit: 50, order: [addedDate_ASC]) {\n        items {\n          ...RelatedOutputData\n        }\n      }\n    }\n    relatedEventsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        title\n        endDate\n      }\n    }\n    doi\n    rrid\n    accessionNumber\n    relatedEntitiesCollection {\n      total\n      items {\n        __typename\n        ... on Projects {\n          sys {\n            id\n          }\n          title\n        }\n        ... on WorkingGroups {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n    contributingCohortsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n        studyLink\n      }\n    }\n    versionsCollection {\n      total\n      items {\n        sys {\n          id\n        }\n        title\n        documentType\n        type\n        addedDate\n        link\n        rrid\n        accessionNumber\n        doi\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  fragment OutputsContentData on Outputs {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    documentType\n    type\n    subtype\n    description\n    shortDescription\n    gp2Supported\n    sharingStatus\n    link\n    addedDate\n    publishDate\n    lastUpdatedPartial\n    authorsCollection(limit: 10) {\n      total\n      items {\n        __typename\n        ... on Users {\n          sys {\n            id\n          }\n          firstName\n          nickname\n          lastName\n          email\n          avatar {\n            url\n          }\n          onboarded\n          alumniSinceDate\n        }\n        ... on ExternalUsers {\n          sys {\n            id\n          }\n          name\n        }\n      }\n    }\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    relatedOutputsCollection(limit: 10) {\n      items {\n        ...RelatedOutputData\n      }\n    }\n    linkedFrom {\n      outputsCollection(limit: 50, order: [addedDate_ASC]) {\n        items {\n          ...RelatedOutputData\n        }\n      }\n    }\n    relatedEventsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        title\n        endDate\n      }\n    }\n    doi\n    rrid\n    accessionNumber\n    relatedEntitiesCollection {\n      total\n      items {\n        __typename\n        ... on Projects {\n          sys {\n            id\n          }\n          title\n        }\n        ... on WorkingGroups {\n          sys {\n            id\n          }\n          title\n        }\n      }\n    }\n    contributingCohortsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n        studyLink\n      }\n    }\n    versionsCollection {\n      total\n      items {\n        sys {\n          id\n        }\n        title\n        documentType\n        type\n        addedDate\n        link\n        rrid\n        accessionNumber\n        doi\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputById($id: String!) {\n    outputs(id: $id) {\n      ...OutputsContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputById($id: String!) {\n    outputs(id: $id) {\n      ...OutputsContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputs(\n    $limit: Int\n    $skip: Int\n    $order: [OutputsOrder]\n    $where: OutputsFilter\n    $preview: Boolean\n  ) {\n    outputsCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n      preview: $preview\n    ) {\n      total\n      items {\n        ...OutputsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputs(\n    $limit: Int\n    $skip: Int\n    $order: [OutputsOrder]\n    $where: OutputsFilter\n    $preview: Boolean\n  ) {\n    outputsCollection(\n      limit: $limit\n      skip: $skip\n      order: $order\n      where: $where\n      preview: $preview\n    ) {\n      total\n      items {\n        ...OutputsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputsByWorkingGroupId($id: String!, $limit: Int, $skip: Int) {\n    workingGroups(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputsByWorkingGroupId($id: String!, $limit: Int, $skip: Int) {\n    workingGroups(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputsByUserId($id: String!, $limit: Int, $skip: Int) {\n    users(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputsByUserId($id: String!, $limit: Int, $skip: Int) {\n    users(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputsByExternalUserId($id: String!, $limit: Int, $skip: Int) {\n    externalUsers(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputsByExternalUserId($id: String!, $limit: Int, $skip: Int) {\n    externalUsers(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputsByProjectId($id: String!, $limit: Int, $skip: Int) {\n    projects(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputsByProjectId($id: String!, $limit: Int, $skip: Int) {\n    projects(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchOutputsByEventId($id: String!, $limit: Int, $skip: Int) {\n    events(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchOutputsByEventId($id: String!, $limit: Int, $skip: Int) {\n    events(id: $id) {\n      sys {\n        id\n      }\n      linkedFrom {\n        outputsCollection(limit: $limit, skip: $skip) {\n          total\n          items {\n            ...OutputsContentData\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment PageContentData on Pages {\n    sys {\n      id\n    }\n    title\n    path\n    shortText\n    text {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    link\n    linkText\n  }\n',
): (typeof documents)['\n  fragment PageContentData on Pages {\n    sys {\n      id\n    }\n    title\n    path\n    shortText\n    text {\n      json\n      links {\n        entries {\n          inline {\n            sys {\n              id\n            }\n            __typename\n            ... on Media {\n              url\n            }\n          }\n        }\n        assets {\n          block {\n            sys {\n              id\n            }\n            url\n            description\n            contentType\n            width\n            height\n          }\n        }\n      }\n    }\n    link\n    linkText\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchPages($where: PagesFilter) {\n    pagesCollection(limit: 100, where: $where) {\n      total\n      items {\n        ...PageContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchPages($where: PagesFilter) {\n    pagesCollection(limit: 100, where: $where) {\n      total\n      items {\n        ...PageContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment ProjectMemberData on ProjectMembership {\n    sys {\n      id\n    }\n    role\n    inactiveSinceDate\n    user {\n      sys {\n        id\n      }\n      firstName\n      nickname\n      lastName\n      onboarded\n      alumniSinceDate\n      avatar {\n        url\n      }\n    }\n  }\n',
): (typeof documents)['\n  fragment ProjectMemberData on ProjectMembership {\n    sys {\n      id\n    }\n    role\n    inactiveSinceDate\n    user {\n      sys {\n        id\n      }\n      firstName\n      nickname\n      lastName\n      onboarded\n      alumniSinceDate\n      avatar {\n        url\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment ProjectsContentFields on Projects {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    startDate\n    endDate\n    status\n    projectProposal\n    description\n    pmEmail\n    leadEmail\n    tagsCollection(limit: 6) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    traineeProject\n    opportunitiesAvailable\n    opportunitiesShortText\n    opportunitiesLinkName\n    opportunitiesLink\n    membersCollection(limit: 100) {\n      total\n      items {\n        ...ProjectMemberData\n      }\n    }\n    milestonesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        description\n        externalLink\n        status\n        title\n      }\n    }\n    resourcesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        type\n        title\n        description\n        externalLink\n      }\n    }\n    calendar {\n      sys {\n        id\n      }\n      name\n    }\n  }\n  \n',
): (typeof documents)['\n  fragment ProjectsContentFields on Projects {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    startDate\n    endDate\n    status\n    projectProposal\n    description\n    pmEmail\n    leadEmail\n    tagsCollection(limit: 6) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    traineeProject\n    opportunitiesAvailable\n    opportunitiesShortText\n    opportunitiesLinkName\n    opportunitiesLink\n    membersCollection(limit: 100) {\n      total\n      items {\n        ...ProjectMemberData\n      }\n    }\n    milestonesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        description\n        externalLink\n        status\n        title\n      }\n    }\n    resourcesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        type\n        title\n        description\n        externalLink\n      }\n    }\n    calendar {\n      sys {\n        id\n      }\n      name\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchProjectById($id: String!) {\n    projects(id: $id) {\n      ...ProjectsContentFields\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchProjectById($id: String!) {\n    projects(id: $id) {\n      ...ProjectsContentFields\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchProjects($limit: Int, $skip: Int, $where: ProjectsFilter) {\n    projectsCollection(limit: $limit, skip: $skip, where: $where) {\n      total\n      items {\n        ...ProjectsContentFields\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchProjects($limit: Int, $skip: Int, $where: ProjectsFilter) {\n    projectsCollection(limit: $limit, skip: $skip, where: $where) {\n      total\n      items {\n        ...ProjectsContentFields\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchProjectsByUser($limit: Int, $skip: Int, $userId: String!) {\n    projectMembershipCollection(\n      limit: $limit\n      skip: $skip\n      where: { user: { sys: { id: $userId } } }\n    ) {\n      total\n      items {\n        linkedFrom {\n          projectsCollection(limit: 1) {\n            total\n            items {\n              ...ProjectsContentFields\n            }\n          }\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchProjectsByUser($limit: Int, $skip: Int, $userId: String!) {\n    projectMembershipCollection(\n      limit: $limit\n      skip: $skip\n      where: { user: { sys: { id: $userId } } }\n    ) {\n      total\n      items {\n        linkedFrom {\n          projectsCollection(limit: 1) {\n            total\n            items {\n              ...ProjectsContentFields\n            }\n          }\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchProjectMembers($id: String!, $limit: Int!, $skip: Int!) {\n    projects(id: $id) {\n      membersCollection(limit: $limit, skip: $skip) {\n        total\n        items {\n          ...ProjectMemberData\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchProjectMembers($id: String!, $limit: Int!, $skip: Int!) {\n    projects(id: $id) {\n      membersCollection(limit: $limit, skip: $skip) {\n        total\n        items {\n          ...ProjectMemberData\n        }\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchReminders(\n    $outputFilter: OutputsFilter\n    $outputVersionFilter: OutputVersionFilter\n    $userId: String!\n  ) {\n    users(id: $userId) {\n      linkedFrom {\n        workingGroupMembershipCollection(limit: 15) {\n          items {\n            linkedFrom {\n              workingGroupsCollection(limit: 1) {\n                items {\n                  sys {\n                    id\n                  }\n                }\n              }\n            }\n          }\n        }\n        projectMembershipCollection(limit: 15) {\n          items {\n            linkedFrom {\n              projectsCollection(limit: 1) {\n                items {\n                  sys {\n                    id\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    outputsCollection(where: $outputFilter) {\n      items {\n        sys {\n          id\n        }\n        title\n        documentType\n        addedDate\n        createdBy {\n          firstName\n          lastName\n        }\n        relatedEntitiesCollection(limit: 1) {\n          items {\n            __typename\n            ... on Projects {\n              sys {\n                id\n              }\n              title\n            }\n            ... on WorkingGroups {\n              sys {\n                id\n              }\n              title\n            }\n          }\n        }\n      }\n    }\n    outputVersionCollection(where: $outputVersionFilter) {\n      items {\n        sys {\n          id\n          publishedAt\n        }\n        linkedFrom {\n          outputsCollection(limit: 1) {\n            items {\n              sys {\n                id\n              }\n              title\n              documentType\n              createdBy {\n                firstName\n                lastName\n              }\n              relatedEntitiesCollection(limit: 1) {\n                items {\n                  __typename\n                  ... on Projects {\n                    sys {\n                      id\n                    }\n                    title\n                  }\n                  ... on WorkingGroups {\n                    sys {\n                      id\n                    }\n                    title\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchReminders(\n    $outputFilter: OutputsFilter\n    $outputVersionFilter: OutputVersionFilter\n    $userId: String!\n  ) {\n    users(id: $userId) {\n      linkedFrom {\n        workingGroupMembershipCollection(limit: 15) {\n          items {\n            linkedFrom {\n              workingGroupsCollection(limit: 1) {\n                items {\n                  sys {\n                    id\n                  }\n                }\n              }\n            }\n          }\n        }\n        projectMembershipCollection(limit: 15) {\n          items {\n            linkedFrom {\n              projectsCollection(limit: 1) {\n                items {\n                  sys {\n                    id\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    outputsCollection(where: $outputFilter) {\n      items {\n        sys {\n          id\n        }\n        title\n        documentType\n        addedDate\n        createdBy {\n          firstName\n          lastName\n        }\n        relatedEntitiesCollection(limit: 1) {\n          items {\n            __typename\n            ... on Projects {\n              sys {\n                id\n              }\n              title\n            }\n            ... on WorkingGroups {\n              sys {\n                id\n              }\n              title\n            }\n          }\n        }\n      }\n    }\n    outputVersionCollection(where: $outputVersionFilter) {\n      items {\n        sys {\n          id\n          publishedAt\n        }\n        linkedFrom {\n          outputsCollection(limit: 1) {\n            items {\n              sys {\n                id\n              }\n              title\n              documentType\n              createdBy {\n                firstName\n                lastName\n              }\n              relatedEntitiesCollection(limit: 1) {\n                items {\n                  __typename\n                  ... on Projects {\n                    sys {\n                      id\n                    }\n                    title\n                  }\n                  ... on WorkingGroups {\n                    sys {\n                      id\n                    }\n                    title\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment LatestStatsContentData on LatestStats {\n    sampleCount\n    articleCount\n    cohortCount\n  }\n',
): (typeof documents)['\n  fragment LatestStatsContentData on LatestStats {\n    sampleCount\n    articleCount\n    cohortCount\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchLatestStats {\n    latestStatsCollection(limit: 1) {\n      total\n      items {\n        ...LatestStatsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchLatestStats {\n    latestStatsCollection(limit: 1) {\n      total\n      items {\n        ...LatestStatsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment TagsContentData on Tags {\n    sys {\n      id\n    }\n    name\n  }\n',
): (typeof documents)['\n  fragment TagsContentData on Tags {\n    sys {\n      id\n    }\n    name\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchTags($limit: Int, $order: [TagsOrder]) {\n    tagsCollection(limit: $limit, order: $order) {\n      total\n      items {\n        ...TagsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchTags($limit: Int, $order: [TagsOrder]) {\n    tagsCollection(limit: $limit, order: $order) {\n      total\n      items {\n        ...TagsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment UsersContentData on Users {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    activeCampaignId\n    activatedDate\n    firstName\n    middleName\n    lastName\n    nickname\n    avatar {\n      url\n    }\n    degrees\n    country\n    stateOrProvince\n    city\n    region\n    email\n    alternativeEmail\n    telephoneCountryCode\n    telephoneNumber\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    biography\n    questions\n    fundingStreams\n    blog\n    linkedIn\n    blueSky\n    threads\n    twitter\n    github\n    googleScholar\n    orcid\n    orcidLastModifiedDate\n    orcidLastSyncDate\n    orcidWorks\n    researchGate\n    researcherId\n    connections\n    role\n    onboarded\n    alumniSinceDate\n    alumniLocation\n    alumniLastUpdated\n    positions\n    activatedDate\n    contributingCohortsCollection(limit: 10) {\n      items {\n        contributingCohort {\n          sys {\n            id\n          }\n          name\n          studyLink\n        }\n        role\n      }\n    }\n    linkedFrom {\n      projectMembershipCollection(limit: 30) {\n        items {\n          user {\n            sys {\n              id\n            }\n          }\n          role\n          linkedFrom {\n            projectsCollection(limit: 1) {\n              items {\n                sys {\n                  id\n                }\n                title\n                status\n                membersCollection(limit: 25) {\n                  total\n                  items {\n                    role\n                    user {\n                      sys {\n                        id\n                      }\n                      onboarded\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n      workingGroupMembershipCollection(limit: 10) {\n        items {\n          user {\n            sys {\n              id\n            }\n          }\n          role\n          linkedFrom {\n            workingGroupsCollection(limit: 1) {\n              items {\n                sys {\n                  id\n                }\n                title\n                membersCollection(limit: 50) {\n                  total\n                  items {\n                    role\n                    user {\n                      sys {\n                        id\n                      }\n                      onboarded\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n      outputsCollection(limit: 8) {\n        items {\n          sys {\n            id\n          }\n          title\n          shortDescription\n          sharingStatus\n          gp2Supported\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  fragment UsersContentData on Users {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    activeCampaignId\n    activatedDate\n    firstName\n    middleName\n    lastName\n    nickname\n    avatar {\n      url\n    }\n    degrees\n    country\n    stateOrProvince\n    city\n    region\n    email\n    alternativeEmail\n    telephoneCountryCode\n    telephoneNumber\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n    biography\n    questions\n    fundingStreams\n    blog\n    linkedIn\n    blueSky\n    threads\n    twitter\n    github\n    googleScholar\n    orcid\n    orcidLastModifiedDate\n    orcidLastSyncDate\n    orcidWorks\n    researchGate\n    researcherId\n    connections\n    role\n    onboarded\n    alumniSinceDate\n    alumniLocation\n    alumniLastUpdated\n    positions\n    activatedDate\n    contributingCohortsCollection(limit: 10) {\n      items {\n        contributingCohort {\n          sys {\n            id\n          }\n          name\n          studyLink\n        }\n        role\n      }\n    }\n    linkedFrom {\n      projectMembershipCollection(limit: 30) {\n        items {\n          user {\n            sys {\n              id\n            }\n          }\n          role\n          linkedFrom {\n            projectsCollection(limit: 1) {\n              items {\n                sys {\n                  id\n                }\n                title\n                status\n                membersCollection(limit: 25) {\n                  total\n                  items {\n                    role\n                    user {\n                      sys {\n                        id\n                      }\n                      onboarded\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n      workingGroupMembershipCollection(limit: 10) {\n        items {\n          user {\n            sys {\n              id\n            }\n          }\n          role\n          linkedFrom {\n            workingGroupsCollection(limit: 1) {\n              items {\n                sys {\n                  id\n                }\n                title\n                membersCollection(limit: 50) {\n                  total\n                  items {\n                    role\n                    user {\n                      sys {\n                        id\n                      }\n                      onboarded\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n      outputsCollection(limit: 8) {\n        items {\n          sys {\n            id\n          }\n          title\n          shortDescription\n          sharingStatus\n          gp2Supported\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchUserById($id: String!) {\n    users(id: $id) {\n      ...UsersContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchUserById($id: String!) {\n    users(id: $id) {\n      ...UsersContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchUsers(\n    $limit: Int\n    $skip: Int\n    $order: [UsersOrder]\n    $where: UsersFilter\n  ) {\n    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...UsersContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchUsers(\n    $limit: Int\n    $skip: Int\n    $order: [UsersOrder]\n    $where: UsersFilter\n  ) {\n    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        ...UsersContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchUsersByProjectIds($ids: [String]!) {\n    projectsCollection(limit: 20, where: { sys: { id_in: $ids } }) {\n      total\n      items {\n        sys {\n          id\n        }\n        membersCollection(limit: 25) {\n          total\n          items {\n            user {\n              sys {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchUsersByProjectIds($ids: [String]!) {\n    projectsCollection(limit: 20, where: { sys: { id_in: $ids } }) {\n      total\n      items {\n        sys {\n          id\n        }\n        membersCollection(limit: 25) {\n          total\n          items {\n            user {\n              sys {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchUsersByWorkingGroupIds($ids: [String]!) {\n    workingGroupsCollection(limit: 20, where: { sys: { id_in: $ids } }) {\n      total\n      items {\n        sys {\n          id\n        }\n        membersCollection(limit: 50) {\n          total\n          items {\n            user {\n              sys {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchUsersByWorkingGroupIds($ids: [String]!) {\n    workingGroupsCollection(limit: 20, where: { sys: { id_in: $ids } }) {\n      total\n      items {\n        sys {\n          id\n        }\n        membersCollection(limit: 50) {\n          total\n          items {\n            user {\n              sys {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchUsersByTagIds($ids: [String]!) {\n    usersCollection(where: { tags: { sys: { id_in: $ids } } }) {\n      total\n      items {\n        sys {\n          id\n        }\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchUsersByTagIds($ids: [String]!) {\n    usersCollection(where: { tags: { sys: { id_in: $ids } } }) {\n      total\n      items {\n        sys {\n          id\n        }\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchUsersForOrcidSync(\n    $limit: Int\n    $skip: Int\n    $order: [UsersOrder]\n    $where: UsersFilter\n  ) {\n    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        sys {\n          id\n        }\n        email\n        orcid\n      }\n    }\n  }\n',
): (typeof documents)['\n  query FetchUsersForOrcidSync(\n    $limit: Int\n    $skip: Int\n    $order: [UsersOrder]\n    $where: UsersFilter\n  ) {\n    usersCollection(limit: $limit, skip: $skip, order: $order, where: $where) {\n      total\n      items {\n        sys {\n          id\n        }\n        email\n        orcid\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment WorkingGroupNetworkContentData on WorkingGroupNetwork {\n    supportCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    monogenicCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    operationalCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    complexDiseaseCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  fragment WorkingGroupNetworkContentData on WorkingGroupNetwork {\n    supportCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    monogenicCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    operationalCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n    complexDiseaseCollection(limit: 10) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchWorkingGroupNetwork {\n    workingGroupNetworkCollection(limit: 1) {\n      total\n      items {\n        ...WorkingGroupNetworkContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchWorkingGroupNetwork {\n    workingGroupNetworkCollection(limit: 1) {\n      total\n      items {\n        ...WorkingGroupNetworkContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment WorkingGroupMemberData on WorkingGroupMembership {\n    sys {\n      id\n    }\n    role\n    inactiveSinceDate\n    user {\n      sys {\n        id\n      }\n      firstName\n      nickname\n      lastName\n      onboarded\n      alumniSinceDate\n      avatar {\n        url\n      }\n    }\n  }\n',
): (typeof documents)['\n  fragment WorkingGroupMemberData on WorkingGroupMembership {\n    sys {\n      id\n    }\n    role\n    inactiveSinceDate\n    user {\n      sys {\n        id\n      }\n      firstName\n      nickname\n      lastName\n      onboarded\n      alumniSinceDate\n      avatar {\n        url\n      }\n    }\n  }\n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  fragment WorkingGroupsContentData on WorkingGroups {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    shortDescription\n    description {\n      json\n    }\n    primaryEmail\n    secondaryEmail\n    leadingMembers\n    membersCollection(limit: 100) {\n      total\n      items {\n        ...WorkingGroupMemberData\n      }\n    }\n    milestonesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        description\n        externalLink\n        status\n        title\n      }\n    }\n    resourcesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        type\n        title\n        description\n        externalLink\n      }\n    }\n    calendar {\n      sys {\n        id\n      }\n      name\n    }\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  fragment WorkingGroupsContentData on WorkingGroups {\n    sys {\n      id\n      firstPublishedAt\n      publishedAt\n      publishedVersion\n    }\n    title\n    shortDescription\n    description {\n      json\n    }\n    primaryEmail\n    secondaryEmail\n    leadingMembers\n    membersCollection(limit: 100) {\n      total\n      items {\n        ...WorkingGroupMemberData\n      }\n    }\n    milestonesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        description\n        externalLink\n        status\n        title\n      }\n    }\n    resourcesCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        type\n        title\n        description\n        externalLink\n      }\n    }\n    calendar {\n      sys {\n        id\n      }\n      name\n    }\n    tagsCollection(limit: 10) {\n      total\n      items {\n        sys {\n          id\n        }\n        name\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchWorkingGroupById($id: String!) {\n    workingGroups(id: $id) {\n      ...WorkingGroupsContentData\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchWorkingGroupById($id: String!) {\n    workingGroups(id: $id) {\n      ...WorkingGroupsContentData\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchWorkingGroups {\n    workingGroupsCollection(limit: 50) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchWorkingGroups {\n    workingGroupsCollection(limit: 50) {\n      total\n      items {\n        ...WorkingGroupsContentData\n      }\n    }\n  }\n  \n'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: '\n  query FetchWorkingGroupMembers($id: String!, $limit: Int!, $skip: Int!) {\n    workingGroups(id: $id) {\n      membersCollection(limit: $limit, skip: $skip) {\n        total\n        items {\n          ...WorkingGroupMemberData\n        }\n      }\n    }\n  }\n  \n',
): (typeof documents)['\n  query FetchWorkingGroupMembers($id: String!, $limit: Int!, $skip: Int!) {\n    workingGroups(id: $id) {\n      membersCollection(limit: $limit, skip: $skip) {\n        total\n        items {\n          ...WorkingGroupMemberData\n        }\n      }\n    }\n  }\n  \n'];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
