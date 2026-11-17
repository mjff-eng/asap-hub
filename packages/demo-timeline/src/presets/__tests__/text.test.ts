import {
  charactersPerLine,
  escapeXml,
  sansFontFamily,
  serifFontFamily,
  svgDocument,
  svgTextElement,
  wrapText,
} from '../text';

describe('escapeXml', () => {
  it('escapes every character that would break the markup', () => {
    expect(escapeXml(`Tom & "Jerry" <b>it's</b>`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;b&gt;it&#39;s&lt;/b&gt;',
    );
  });

  it('escapes an ampersand only once', () => {
    expect(escapeXml('R&D')).toBe('R&amp;D');
  });

  it('leaves plain text alone', () => {
    expect(escapeXml('Attendance')).toBe('Attendance');
  });
});

describe('charactersPerLine', () => {
  it('scales with the available width', () => {
    expect(charactersPerLine(1000, 100, 'sans')).toBe(19);
    expect(charactersPerLine(2000, 100, 'sans')).toBe(38);
  });

  it('fits more of a serif face on a line', () => {
    expect(charactersPerLine(1000, 100, 'serif')).toBe(20);
  });

  it('never reports fewer than one character', () => {
    expect(charactersPerLine(10, 100, 'sans')).toBe(1);
  });
});

describe('wrapText', () => {
  it('packs words greedily', () => {
    expect(wrapText('one two three four', 9, 3)).toEqual([
      'one two',
      'three',
      'four',
    ]);
  });

  it('keeps short text on a single line', () => {
    expect(wrapText('Attendance', 20, 3)).toEqual(['Attendance']);
  });

  it('collapses surrounding whitespace', () => {
    expect(wrapText('  spaced   out  ', 20, 3)).toEqual(['spaced out']);
  });

  it('breaks a word that cannot fit on any line', () => {
    expect(wrapText('supercalifragilistic', 8, 3)).toEqual([
      'supercal',
      'ifragili',
      'stic',
    ]);
  });

  it('truncates past the line limit with an ellipsis', () => {
    expect(wrapText('one two three four five six', 9, 2)).toEqual([
      'one two',
      'three...',
    ]);
  });

  it('has no lines for empty text', () => {
    expect(wrapText('   ', 20, 3)).toEqual([]);
  });
});

describe('svgTextElement', () => {
  it('escapes the text and keeps the font stack quoting intact', () => {
    expect(
      svgTextElement({
        text: 'R&D',
        x: 10,
        y: 20,
        fontFamily: sansFontFamily,
        fontSize: 40,
        fontWeight: 600,
        fill: '#ffffff',
        anchor: 'start',
      }),
    ).toBe(
      `<text x="10" y="20" font-family="${sansFontFamily}" font-size="40" font-weight="600" fill="#ffffff" text-anchor="start">R&amp;D</text>`,
    );
  });

  it('offers a serif stack for headings', () => {
    expect(serifFontFamily).toContain('serif');
  });
});

describe('svgDocument', () => {
  it('declares the namespace and sizes itself to the canvas', () => {
    expect(svgDocument({ width: 640, height: 360 }, ['<rect/>'])).toBe(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">',
        '  <rect/>',
        '</svg>',
      ].join('\n'),
    );
  });
});
