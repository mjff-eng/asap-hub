/* istanbul ignore file */

import { gql } from 'graphql-tag';

export const researchOutputContentQueryFragment = gql`
  fragment ResearchOutputsContent on ResearchOutputs {
    sys {
      id
      publishedVersion
    }
    title
    descriptionMd
    shortDescription
    changelog
    link
    addedDate
    createdDate
    lastUpdatedPartial
    documentType
    sharingStatus
    labCatalogNumber
    doi
    accession
    rrid
    asapFunded
    usedInAPublication
    type
    publishDate
    impact {
      sys {
        id
      }
      name
    }
    layImpactStatement
    categoriesCollection(limit: 2) {
      items {
        sys {
          id
        }
        name
      }
    }
    description {
      json
      links {
        entries {
          inline {
            sys {
              id
            }
            __typename
            ... on Media {
              url
            }
          }
        }
        assets {
          block {
            sys {
              id
            }
            url
            description
            contentType
            width
            height
          }
        }
      }
    }
    usageNotes
    statusChangedBy {
      sys {
        id
      }
      firstName
      lastName
      email
    }
    statusChangedAt
    isInReview
    authorsCollection(limit: 100) {
      items {
        __typename
        ... on ExternalAuthors {
          sys {
            id
          }
          name
          orcid
        }
        ... on Users {
          sys {
            id
          }
          firstName
          nickname
          lastName
          email
          onboarded
          orcid
          alumniSinceDate
          avatar {
            url
          }
        }
      }
    }
    teamsCollection(limit: 20) {
      items {
        sys {
          id
        }
        displayName
        teamType
        researchTheme {
          name
        }
        linkedFrom {
          projectMembershipCollection(limit: 1) {
            items {
              linkedFrom {
                projectsCollection(limit: 1) {
                  items {
                    sys {
                      id
                    }
                    title
                    projectType
                    projectId
                  }
                }
              }
            }
          }
          teamMembershipCollection @include(if: $fetchPMs) {
            items {
              role
              inactiveSinceDate
              linkedFrom {
                usersCollection(limit: 1) {
                  items {
                    email
                  }
                }
              }
            }
          }
        }
      }
    }
    project {
      sys {
        id
      }
      title
      projectType
      projectId
    }
    workingGroup {
      sys {
        id
      }
      title
    }
    methodsCollection(limit: 5) {
      items {
        name
      }
    }
    keywordsCollection(limit: 20) {
      items {
        name
      }
    }
    organismsCollection(limit: 5) {
      items {
        name
      }
    }
    environmentsCollection(limit: 5) {
      items {
        name
      }
    }
    subtype {
      name
    }
    labsCollection(limit: 20) {
      items {
        sys {
          id
        }
        name
      }
    }
    relatedResearchCollection(limit: 20, where: $relatedResearchWhere) {
      items {
        sys {
          id
        }
        title
        type
        documentType
        teamsCollection(limit: 20) @include(if: $singleOutput) {
          items {
            sys {
              id
            }
            displayName
          }
        }
        workingGroup @include(if: $singleOutput) {
          sys {
            id
          }
          title
        }
      }
    }
    linkedFrom {
      researchOutputsCollection(limit: 60, order: [addedDate_ASC]) {
        items {
          sys {
            id
          }
          title
          type
          documentType
          teamsCollection(limit: 20) @include(if: $singleOutput) {
            items {
              sys {
                id
              }
              displayName
            }
          }
          workingGroup @include(if: $singleOutput) {
            sys {
              id
            }
            title
          }
        }
      }
    }
    relatedEventsCollection(limit: 10) {
      items {
        sys {
          id
        }
        title
        endDate
      }
    }
    versionsCollection {
      items {
        sys {
          id
        }
        title
        documentType
        type
        addedDate
        link
        rrid
        accession
        doi
      }
    }
    relatedManuscriptVersion {
      sys {
        id
      }
      linkedFrom {
        manuscriptsCollection(limit: 1) {
          items {
            sys {
              id
            }
          }
        }
      }
    }
  }
`;

const grantDocumentProjectQueryFragment = gql`
  fragment GrantDocumentProject on Projects {
    sys {
      id
    }
    title
    projectType
    originalGrant
    startDate
    endDate
    membersCollection(limit: 100) {
      items {
        projectMember {
          __typename
          ... on Teams {
            sys {
              id
            }
            displayName
          }
        }
      }
    }
    proposal {
      sys {
        id
      }
      title
    }
    supplementGrant {
      title
      description
      startDate
      endDate
      proposal {
        sys {
          id
        }
      }
    }
  }
`;

const grantDocumentQueryFragment = gql`
  fragment GrantDocumentContent on ResearchOutputs {
    grantPdf {
      url
    }
    linkedFrom {
      projectsCollection(limit: 1) {
        items {
          ...GrantDocumentProject
        }
      }
      supplementGrantCollection(limit: 1) {
        items {
          linkedFrom {
            projectsCollection(limit: 1) {
              items {
                ...GrantDocumentProject
              }
            }
          }
        }
      }
    }
  }
  ${grantDocumentProjectQueryFragment}
`;

export const FETCH_RESEARCH_OUTPUT_BY_ID = gql`
  query FetchResearchOutputById(
    $id: String!
    $preview: Boolean
    $fetchPMs: Boolean = true
    $singleOutput: Boolean = true
    $relatedResearchWhere: ResearchOutputsFilter = {}
    $includeGrantDocument: Boolean = false
  ) {
    researchOutputs(id: $id, preview: $preview) {
      ...ResearchOutputsContent
      ...GrantDocumentContent @include(if: $includeGrantDocument)
    }
  }
  ${researchOutputContentQueryFragment}
  ${grantDocumentQueryFragment}
`;

export const FETCH_RESEARCH_OUTPUTS = gql`
  query FetchResearchOutputs(
    $limit: Int
    $skip: Int
    $order: [ResearchOutputsOrder]
    $where: ResearchOutputsFilter
    $preview: Boolean
    $fetchPMs: Boolean = false
    $singleOutput: Boolean = false
    $relatedResearchWhere: ResearchOutputsFilter
  ) {
    researchOutputsCollection(
      limit: $limit
      skip: $skip
      order: $order
      where: $where
      preview: $preview
    ) {
      total
      items {
        ...ResearchOutputsContent
      }
    }
  }
  ${researchOutputContentQueryFragment}
`;
