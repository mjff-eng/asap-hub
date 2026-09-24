import { createUserListItemResponse } from '@asap-hub/fixtures';
import { userToCSV } from '../export';

describe('userToCSV', () => {
  it('maps all fields correctly', () => {
    const user = {
      ...createUserListItemResponse({ teams: 1, labs: 1 }, 0),
      firstName: 'Jane',
      middleName: 'M',
      lastName: 'Doe',
      email: 'jane@example.com',
      orcid: '0000-0001-2345-6789',
      degree: 'PhD' as const,
      country: 'United States',
      stateOrProvince: 'California',
      city: 'San Francisco',
      jobTitle: 'Research Scientist',
      institution: 'MIT',
      contactEmail: 'jane.contact@example.com',
      tags: [
        { id: '2', name: 'Neuroscience' },
        { id: '1', name: 'AI' },
      ],
      biography: 'A researcher focused on neuroscience.',
      openScienceTeamMember: true,
      alumniSinceDate: '2024-01-15T00:00:00.000Z',
      social: {
        website1: 'https://jane.example.com',
        website2: 'https://lab.example.com',
        researcherId: 'A-1234-2020',
        linkedIn: 'janedoe',
        blueSky: 'jane.bsky.social',
        twitter: 'janedoe',
        github: 'jane-doe',
        googleScholar: 'scholar-id',
        researchGate: 'Jane_Doe',
      },
    };

    expect(userToCSV(user)).toEqual({
      'First Name': 'Jane',
      'Middle Name': 'M',
      'Last Name': 'Doe',
      Email: 'jane@example.com',
      ORCID: '0000-0001-2345-6789',
      Degree: 'PhD',
      Country: 'United States',
      State: 'California',
      City: 'San Francisco',
      'Job Title': 'Research Scientist',
      Institution: 'MIT',
      'Correspondence Email': 'jane.contact@example.com',
      Tags: 'AI, Neuroscience',
      Biography: 'A researcher focused on neuroscience.',
      'Open Science Member': 'Yes',
      'Alumni Since Date': '2024-01-15T00:00:00.000Z',
      'Team Name': user.teams.map((t) => t.displayName).join(', '),
      Role: user.teams.map((t) => t.role).join(', '),
      'Website 1': 'https://jane.example.com',
      'Website 2': 'https://lab.example.com',
      'Research ID': 'A-1234-2020',
      LinkedIn: 'janedoe',
      BlueSky: 'jane.bsky.social',
      Twitter: 'janedoe',
      GitHub: 'jane-doe',
      'Google Scholar': 'scholar-id',
      'Research Gate': 'Jane_Doe',
    });
  });

  it('handles missing optional fields', () => {
    const user = {
      ...createUserListItemResponse({}, 0),
      middleName: undefined,
      orcid: undefined,
      degree: undefined,
      contactEmail: undefined,
      biography: undefined,
      alumniSinceDate: undefined,
      social: undefined,
    };

    const csv = userToCSV(user);
    expect(csv['Middle Name']).toBe('');
    expect(csv.ORCID).toBe('');
    expect(csv.Degree).toBe('');
    expect(csv['Correspondence Email']).toBe('');
    expect(csv.Biography).toBe('');
    expect(csv['Alumni Since Date']).toBe('');
    expect(csv['Open Science Member']).toBe('No');
    expect(csv['Website 1']).toBe('');
    expect(csv['Website 2']).toBe('');
    expect(csv['Research ID']).toBe('');
    expect(csv.LinkedIn).toBe('');
    expect(csv.BlueSky).toBe('');
    expect(csv.Twitter).toBe('');
    expect(csv.GitHub).toBe('');
    expect(csv['Google Scholar']).toBe('');
    expect(csv['Research Gate']).toBe('');
  });

  it('handles multiple teams', () => {
    const user = {
      ...createUserListItemResponse({ teams: 1 }, 0),
      teams: [
        {
          id: 't1',
          displayName: 'Team Alpha',
          role: 'Lead PI (Core Leadership)' as const,
        },
        {
          id: 't2',
          displayName: 'Team Beta',
          role: 'Co-PI (Core Leadership)' as const,
        },
      ],
    };

    const csv = userToCSV(user);
    expect(csv['Team Name']).toBe('Team Alpha, Team Beta');
    expect(csv.Role).toBe('Lead PI (Core Leadership), Co-PI (Core Leadership)');
  });

  it('handles biography with HTML', () => {
    const user = {
      ...createUserListItemResponse({}, 0),
      biography:
        '<p>A researcher focused on <strong>neuroscience</strong>.</p>',
    };

    const csv = userToCSV(user);
    expect(csv.Biography).toBe('A researcher focused on neuroscience.');
  });

  it('sorts tags alphabetically', () => {
    const user = {
      ...createUserListItemResponse({}, 0),
      tags: [
        { id: '1', name: 'Zebra' },
        { id: '2', name: 'Alpha' },
        { id: '3', name: 'Mango' },
      ],
    };

    const csv = userToCSV(user);
    expect(csv.Tags).toBe('Alpha, Mango, Zebra');
  });
});
