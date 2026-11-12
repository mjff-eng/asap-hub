import * as XLSX from 'xlsx';

export type ParsedTeamRow = { name: string; attended: boolean };

const teamHeaderAliases = ['team', 'team name', 'teams'];
const attendanceHeaderAliases = ['attendance', 'attended', 'status', 'present'];
const attendedValues = new Set([
  'yes',
  'y',
  'true',
  '1',
  'attended',
  'present',
]);

const normalizeCell = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : typeof value === 'number'
      ? String(value)
      : '';

const toCellText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return typeof value === 'number' ? String(value) : '';
};

// SheetJS coerces TRUE/FALSE cells to real booleans, so handle those directly.
const parseAttended = (value: unknown): boolean =>
  typeof value === 'boolean' ? value : attendedValues.has(normalizeCell(value));

const statusValues = new Set([...attendedValues, 'no', 'n', 'false', '0']);

// A headerless list still carries attendance when one of its columns holds
// nothing but yes/no values. Column 0 holds the names, so only look past it,
// and require every non-empty cell to parse: an email or project column fails
// that and is left alone.
const sniffAttendanceColumn = (rows: unknown[][]): number => {
  const width = Math.max(...rows.map((row) => row.length), 0);

  for (let column = 1; column < width; column += 1) {
    const cells = rows
      .map((row) => normalizeCell(row[column]))
      .filter((cell) => cell !== '');
    if (cells.length > 0 && cells.every((cell) => statusValues.has(cell))) {
      return column;
    }
  }
  return -1;
};

const findColumns = (
  rows: unknown[][],
): { teamColumn: number; attendanceColumn: number; skipFirstRow: boolean } => {
  const [firstRow = []] = rows;
  const teamHeader = firstRow.findIndex((cell) =>
    teamHeaderAliases.includes(normalizeCell(cell)),
  );
  const attendanceHeader = firstRow.findIndex((cell) =>
    attendanceHeaderAliases.includes(normalizeCell(cell)),
  );
  const hasHeader = teamHeader !== -1 || attendanceHeader !== -1;
  // With no team header, fall back to the first column that is not the status
  // column, so a status-first sheet doesn't read the status as team names.
  const teamColumn =
    teamHeader !== -1 ? teamHeader : attendanceHeader === 0 ? 1 : 0;
  return {
    teamColumn,
    attendanceColumn: hasHeader
      ? attendanceHeader
      : sniffAttendanceColumn(rows),
    skipFirstRow: hasHeader,
  };
};

export const parseSheet = (data: ArrayBuffer | string): ParsedTeamRow[] => {
  const workbook =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'string' })
      : XLSX.read(data, { type: 'array' });

  const [firstSheetName] = workbook.SheetNames;
  const sheet = firstSheetName && workbook.Sheets[firstSheetName];
  if (!sheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const { teamColumn, attendanceColumn, skipFirstRow } = findColumns(rows);

  return rows
    .slice(skipFirstRow ? 1 : 0)
    .map((row) => ({
      name: toCellText(row[teamColumn]),
      attended:
        attendanceColumn === -1 ? false : parseAttended(row[attendanceColumn]),
    }))
    .filter((row) => row.name);
};

const readFile = (file: File): Promise<ArrayBuffer | string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer | string);
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read ${file.name}`));
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });

export const parseTeamRows = async (file: File): Promise<ParsedTeamRow[]> =>
  parseSheet(await readFile(file));
