import * as XLSX from 'xlsx';

import { parseSheet, parseTeamRows } from '../parse-team-list';

const toXlsxBuffer = (rows: unknown[][]): ArrayBuffer => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    'Sheet1',
  );
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
};

const csvFile = (contents: string, name = 'teams.csv') =>
  new File([contents], name, { type: 'text/csv' });

const xlsxFile = (rows: unknown[][], name = 'teams.xlsx') =>
  new File([toXlsxBuffer(rows)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

const names = (rows: ReturnType<typeof parseSheet>) =>
  rows.map(({ name }) => name);

const realFileReader = window.FileReader;

const withFailingFileReader = (error: Error | null) => {
  window.FileReader = function StubFileReader(this: Record<string, unknown>) {
    this.error = error;
    this.readAsText = () => (this.onerror as () => void)();
  } as unknown as typeof FileReader;
};

afterEach(() => {
  window.FileReader = realFileReader;
});

describe('parseSheet', () => {
  it('Should read a CSV with a Team Name header', () => {
    expect(names(parseSheet('Team Name\nAguzzi\nTeam Alessi\n'))).toEqual([
      'Aguzzi',
      'Team Alessi',
    ]);
  });

  it('Should treat the first row as data when no header is recognised', () => {
    expect(names(parseSheet('Aguzzi\nAlessi\n'))).toEqual(['Aguzzi', 'Alessi']);
  });

  it('Should accept Team and Teams as header aliases', () => {
    expect(names(parseSheet('Team\nAguzzi\n'))).toEqual(['Aguzzi']);
    expect(names(parseSheet('  TEAMS  \nAguzzi\n'))).toEqual(['Aguzzi']);
  });

  it('Should use the headed column when it is not the first one', () => {
    expect(
      names(parseSheet('Email,Team Name\na@b.com,Aguzzi\nc@d.com,Alessi\n')),
    ).toEqual(['Aguzzi', 'Alessi']);
  });

  it('Should keep a quoted comma inside a single name', () => {
    expect(names(parseSheet('Team Name\n"Aguzzi, Alessi"\n'))).toEqual([
      'Aguzzi, Alessi',
    ]);
  });

  it('Should read a semicolon delimited CSV', () => {
    expect(names(parseSheet('Email;Team Name\na@b.com;Aguzzi\n'))).toEqual([
      'Aguzzi',
    ]);
  });

  it('Should tolerate a BOM and CRLF line endings', () => {
    expect(names(parseSheet('﻿Team Name\r\nAguzzi\r\nAlessi\r\n'))).toEqual([
      'Aguzzi',
      'Alessi',
    ]);
  });

  it('Should skip empty rows and blank cells', () => {
    expect(names(parseSheet('Team Name\nAguzzi\n\n   \nAlessi\n'))).toEqual([
      'Aguzzi',
      'Alessi',
    ]);
  });

  it('Should read an XLSX file', () => {
    expect(
      names(parseSheet(toXlsxBuffer([['Team Name'], ['Aguzzi'], ['Alessi']]))),
    ).toEqual(['Aguzzi', 'Alessi']);
  });

  it('Should read numeric team names as text', () => {
    expect(names(parseSheet(toXlsxBuffer([['Team Name'], [42]])))).toEqual([
      '42',
    ]);
  });

  it('Should treat a non-text header cell as no header at all', () => {
    expect(names(parseSheet(toXlsxBuffer([[42], ['Aguzzi']])))).toEqual([
      '42',
      'Aguzzi',
    ]);
  });

  it('Should return nothing for a sheet that has no rows', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([]),
      'Empty',
    );

    expect(
      parseSheet(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })),
    ).toEqual([]);
  });

  describe('attendance status', () => {
    it('Should default to not attended when there is no status column', () => {
      expect(parseSheet('Team Name\nAguzzi\n')).toEqual([
        { name: 'Aguzzi', attended: false },
      ]);
    });

    it.each`
      cell          | attended
      ${'Yes'}      | ${true}
      ${'yes'}      | ${true}
      ${'Y'}        | ${true}
      ${'TRUE'}     | ${true}
      ${'1'}        | ${true}
      ${'Attended'} | ${true}
      ${'Present'}  | ${true}
      ${'No'}       | ${false}
      ${'n'}        | ${false}
      ${'FALSE'}    | ${false}
      ${'0'}        | ${false}
      ${''}         | ${false}
      ${'maybe'}    | ${false}
    `(
      'Should read attendance cell "$cell" as attended=$attended',
      ({ cell, attended }) => {
        expect(parseSheet(`Team Name,Attendance\nAguzzi,${cell}\n`)).toEqual([
          { name: 'Aguzzi', attended },
        ]);
      },
    );

    it('Should accept Attended, Status and Present as status headers', () => {
      expect(parseSheet('Team Name,Attended\nAguzzi,Yes\n')).toEqual([
        { name: 'Aguzzi', attended: true },
      ]);
      expect(parseSheet('Team Name,Status\nAguzzi,Yes\n')).toEqual([
        { name: 'Aguzzi', attended: true },
      ]);
      expect(parseSheet('Team,Present\nAguzzi,No\n')).toEqual([
        { name: 'Aguzzi', attended: false },
      ]);
    });

    it('Should read the status column even when it comes first', () => {
      expect(parseSheet('Attendance,Team Name\nYes,Aguzzi\n')).toEqual([
        { name: 'Aguzzi', attended: true },
      ]);
    });

    it('Should not read the status column as team names when the team header is unrecognised', () => {
      expect(parseSheet('Attendance,Owner\nYes,Aguzzi\n')).toEqual([
        { name: 'Aguzzi', attended: true },
      ]);
    });

    it('Should read a Y/N column in a file with no headers at all', () => {
      expect(parseSheet('Aguzzi,Y\nAlessi,N\nChen,Y\n')).toEqual([
        { name: 'Aguzzi', attended: true },
        { name: 'Alessi', attended: false },
        { name: 'Chen', attended: true },
      ]);
    });

    it('Should sniff a headerless status column past the second one', () => {
      expect(parseSheet('Aguzzi,a@b.com,Yes\n')).toEqual([
        { name: 'Aguzzi', attended: true },
      ]);
    });

    it('Should leave a headerless non-status column alone', () => {
      expect(parseSheet('Aguzzi,a@b.com\nAlessi,c@d.com\n')).toEqual([
        { name: 'Aguzzi', attended: false },
        { name: 'Alessi', attended: false },
      ]);
    });

    it('Should skip a blank column to reach the real status column', () => {
      expect(parseSheet('Aguzzi,,Yes\nAlessi,,No\n')).toEqual([
        { name: 'Aguzzi', attended: true },
        { name: 'Alessi', attended: false },
      ]);
    });

    it('Should read a status column when the team column has no header', () => {
      expect(
        parseSheet(
          toXlsxBuffer([
            [42, 'Attendance'],
            ['Aguzzi', 'Yes'],
          ]),
        ),
      ).toEqual([{ name: 'Aguzzi', attended: true }]);
    });
  });

  it('Should ignore every sheet after the first', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['Team Name'], ['Aguzzi']]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['Team Name'], ['Ignored']]),
      'Second',
    );

    expect(
      names(
        parseSheet(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })),
      ),
    ).toEqual(['Aguzzi']);
  });

  it('Should return nothing for a workbook with no sheet', async () => {
    jest.resetModules();
    jest.doMock('xlsx', () => ({
      ...jest.requireActual('xlsx'),
      read: () => ({ SheetNames: [], Sheets: {} }),
    }));

    const isolated = await import('../parse-team-list');
    expect(isolated.parseSheet('')).toEqual([]);

    jest.dontMock('xlsx');
    jest.resetModules();
  });
});

describe('parseTeamRows', () => {
  it('Should read the rows of a CSV file', async () => {
    await expect(
      parseTeamRows(csvFile('Team Name,Attendance\nAguzzi,Yes\n', 'list.csv')),
    ).resolves.toEqual([{ name: 'Aguzzi', attended: true }]);
  });

  it('Should read the rows of an XLSX file', async () => {
    await expect(
      parseTeamRows(xlsxFile([['Team Name'], ['Alessi']], 'list.xlsx')),
    ).resolves.toEqual([{ name: 'Alessi', attended: false }]);
  });

  it('Should reject with the error the reader reports', async () => {
    const error = new Error('unreadable');
    withFailingFileReader(error);

    await expect(parseTeamRows(csvFile('Team Name\nAguzzi\n'))).rejects.toBe(
      error,
    );
  });

  it('Should reject with a fallback error when the reader gives none', async () => {
    withFailingFileReader(null);

    await expect(
      parseTeamRows(csvFile('Team Name\nAguzzi\n', 'broken.csv')),
    ).rejects.toThrow('Could not read broken.csv');
  });
});
