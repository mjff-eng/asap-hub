import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FieldExtensionSDK } from '@contentful/app-sdk';
import {
  MultipleEntryReferenceEditor,
  CustomEntityCardProps,
  useEntity,
} from '@contentful/field-editor-reference';
import { useSDK, useAutoResizer } from '@contentful/react-apps-toolkit';
import Field, { CustomCard } from '../../locations/Field';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: jest.fn(),
  useAutoResizer: jest.fn(),
}));

jest.mock('@contentful/field-editor-reference', () => ({
  MultipleEntryReferenceEditor: jest.fn(),
  useEntity: jest.fn(),
}));

const mockBaseSdk = () => ({
  window: {
    startAutoResizer: jest.fn(),
  },
  space: {
    unpublishEntry: jest.fn(),
    deleteEntry: jest.fn(),
  },
});

describe('Field component', () => {
  let sdk: jest.Mocked<FieldExtensionSDK>;

  beforeEach(() => {
    sdk = mockBaseSdk() as unknown as jest.Mocked<FieldExtensionSDK>;
    (useSDK as jest.Mock).mockReturnValue(sdk);
    (MultipleEntryReferenceEditor as jest.Mock).mockImplementation(() => (
      <p>MultipleEntryReferenceEditor</p>
    ));
  });

  it('enables automatic resizing', async () => {
    render(<Field />);
    expect(useAutoResizer).toHaveBeenCalled();
  });

  it('passes a custom card renderer to <MultipleEntryReferenceEditor />', async () => {
    render(<Field />);

    expect(MultipleEntryReferenceEditor).toHaveBeenCalled();
    expect(
      (MultipleEntryReferenceEditor as jest.Mock).mock.lastCall[0]
        .renderCustomCard,
    ).toEqual(CustomCard);
  });

  describe('CustomCard component', () => {
    beforeEach(() => {
      // eslint-disable-next-line consistent-return
      (useEntity as jest.Mock).mockImplementation((type, id) => {
        if (id === 'team-1') {
          return {
            data: {
              sys: {
                contentType: {
                  sys: {
                    id: 'teams',
                  },
                },
              },
              fields: {
                displayName: {
                  'en-US': 'My Team',
                },
              },
            },
          };
        }
        if (id === 'user-1') {
          return {
            data: {
              sys: {
                contentType: {
                  sys: {
                    id: 'users',
                  },
                },
              },
              fields: {
                firstName: {
                  'en-US': 'First',
                },
                lastName: {
                  'en-US': 'Last',
                },
              },
            },
          };
        }
        if (id === 'project-1') {
          return {
            data: {
              sys: {
                contentType: {
                  sys: {
                    id: 'projects',
                  },
                },
              },
              fields: {
                title: {
                  'en-US': 'My Project',
                },
              },
            },
          };
        }
        if (id === 'external-author-1') {
          return {
            data: {
              sys: {
                contentType: {
                  sys: {
                    id: 'externalAuthors',
                  },
                },
              },
              fields: {
                name: {
                  'en-US': 'External Speaker',
                },
              },
            },
          };
        }
      });
    });

    it('loads team name from related entity and renders team name', async () => {
      const props = {
        entity: {
          fields: {
            team: {
              'en-US': {
                sys: {
                  id: 'team-1',
                },
              },
            },
            user: null,
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(useEntity).toHaveBeenCalledWith('Entry', 'team-1');
        expect(screen.queryByText('My Team')).toBeInTheDocument();
        expect(screen.queryByText('Team')).toBeInTheDocument();
        expect(screen.queryByText('User')).not.toBeInTheDocument();
        expect(screen.queryByText('External Author')).not.toBeInTheDocument();
      });
    });

    it('loads user name from related entity and renders user name', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: {
              'en-US': {
                sys: {
                  id: 'user-1',
                },
              },
            },
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(useEntity).toHaveBeenCalledWith('Entry', 'user-1');
        expect(screen.queryByText('First Last')).toBeInTheDocument();
        expect(screen.queryByText('Team')).not.toBeInTheDocument();
        expect(screen.queryByText('User')).toBeInTheDocument();
        expect(screen.queryByText('External Author')).not.toBeInTheDocument();
      });
    });

    it('loads external author name from related entity and renders external author name', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: {
              'en-US': {
                sys: {
                  id: 'external-author-1',
                },
              },
            },
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(useEntity).toHaveBeenCalledWith('Entry', 'external-author-1');
        expect(screen.queryByText('External Speaker')).toBeInTheDocument();
        expect(screen.queryByText('Team')).not.toBeInTheDocument();
        expect(screen.queryByText('User')).not.toBeInTheDocument();
        expect(screen.queryByText('External Author')).toBeInTheDocument();
      });
    });

    it('loads project title from related entity and renders project title', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: {
              'en-US': {
                sys: {
                  id: 'user-1',
                },
              },
            },
            project: {
              'en-US': {
                sys: {
                  id: 'project-1',
                },
              },
            },
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(useEntity).toHaveBeenCalledWith('Entry', 'project-1');
        expect(screen.queryByText('My Project')).toBeInTheDocument();
        expect(screen.queryByText('Project')).toBeInTheDocument();
      });
    });

    it('does not render a project title when no project is linked', async () => {
      const props = {
        entity: {
          fields: {
            team: {
              'en-US': {
                sys: {
                  id: 'team-1',
                },
              },
            },
            user: null,
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(screen.queryByText('My Team')).toBeInTheDocument();
      });
      expect(screen.queryByText('Project')).not.toBeInTheDocument();
    });

    it.each`
      preliminaryDataShared | badge
      ${true}               | ${'Preliminary Data Shared'}
      ${false}              | ${'Preliminary Data Not Shared'}
    `(
      'renders the "$badge" badge when preliminaryDataShared is $preliminaryDataShared',
      async ({ preliminaryDataShared, badge }) => {
        const props = {
          entity: {
            fields: {
              team: {
                'en-US': {
                  sys: {
                    id: 'team-1',
                  },
                },
              },
              user: null,
              ...(preliminaryDataShared === undefined
                ? {}
                : {
                    preliminaryDataShared: { 'en-US': preliminaryDataShared },
                  }),
            },
            sys: {
              type: 'Entry',
              publishedVersion: 1,
              version: 1,
            },
          },
          onEdit: jest.fn(),
          onRemove: jest.fn(),
        } as unknown as CustomEntityCardProps;

        render(<CustomCard {...props} />);

        await waitFor(() => {
          expect(screen.getByText(badge)).toBeInTheDocument();
        });
      },
    );

    it.each`
      preliminaryDataShared
      ${null}
      ${undefined}
    `(
      'does not render the preliminary data badge when preliminaryDataShared is $preliminaryDataShared',
      async ({ preliminaryDataShared }) => {
        const props = {
          entity: {
            fields: {
              team: {
                'en-US': {
                  sys: {
                    id: 'team-1',
                  },
                },
              },
              user: null,
              ...(preliminaryDataShared === undefined
                ? {}
                : {
                    preliminaryDataShared: { 'en-US': preliminaryDataShared },
                  }),
            },
            sys: {
              type: 'Entry',
              publishedVersion: 1,
              version: 1,
            },
          },
          onEdit: jest.fn(),
          onRemove: jest.fn(),
        } as unknown as CustomEntityCardProps;

        render(<CustomCard {...props} />);

        await waitFor(() => {
          expect(screen.getByText('My Team')).toBeInTheDocument();
        });
        expect(
          screen.queryByText('Preliminary Data Shared'),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Preliminary Data Not Shared'),
        ).not.toBeInTheDocument();
      },
    );

    it('does not render the preliminary data badge when there is no team, project or user', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: null,
            preliminaryDataShared: { 'en-US': true },
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(screen.getByText('No speakers selected')).toBeInTheDocument();
      });
      expect(
        screen.queryByText('Preliminary Data Shared'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Preliminary Data Not Shared'),
      ).not.toBeInTheDocument();
    });

    it('calls the `onEdit` handler in contentful to open the related entity when clicked', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: null,
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(screen.getByText('No speakers selected')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('No speakers selected'));
      await waitFor(() => {
        expect(props.onEdit).toHaveBeenCalled();
      });
    });

    it('renders a remove button in the card menu', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: null,
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(screen.getByText('No speakers selected')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Actions'));
      await waitFor(() => {
        expect(screen.getByText('Remove')).toBeVisible();
      });
    });

    it('unpublishes and deletes the entry when the remove button is clicked', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: null,
          },
          sys: {
            type: 'Entry',
            publishedVersion: 1,
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(screen.getByText('No speakers selected')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Actions'));
      fireEvent.click(screen.getByText('Remove'));
      await waitFor(() => {
        expect(sdk.space.unpublishEntry).toHaveBeenCalledWith(props.entity);
        expect(sdk.space.deleteEntry).toHaveBeenCalledWith(props.entity);
        expect(props.onRemove).toHaveBeenCalled();
      });
    });

    it('does not unpublish the entry when the remove button is clicked if the entry is unpublished', async () => {
      const props = {
        entity: {
          fields: {
            team: null,
            user: null,
          },
          sys: {
            type: 'Entry',
            version: 1,
          },
        },
        onEdit: jest.fn(),
        onRemove: jest.fn(),
      } as unknown as CustomEntityCardProps;

      render(<CustomCard {...props} />);

      await waitFor(() => {
        expect(screen.getByText('No speakers selected')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Actions'));
      fireEvent.click(screen.getByText('Remove'));
      await waitFor(() => {
        expect(sdk.space.deleteEntry).toHaveBeenCalledWith(props.entity);
        expect(props.onRemove).toHaveBeenCalled();
        expect(sdk.space.unpublishEntry).not.toHaveBeenCalled();
      });
    });
  });
});
