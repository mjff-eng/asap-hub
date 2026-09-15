import { titleCardSvg } from '../titleCard';

const canvas = { width: 1920, height: 1080 };

describe('titleCardSvg', () => {
  it('renders a centred heading', () => {
    expect(
      titleCardSvg({ preset: 'centered', text: 'Attendance', canvas }),
    ).toMatchSnapshot();
  });

  it('renders a heading with a subtitle', () => {
    expect(
      titleCardSvg({
        preset: 'centered',
        text: 'Attendance',
        subtitle: 'How the hub tracks who came to what',
        canvas,
      }),
    ).toMatchSnapshot();
  });

  it('wraps a long heading onto at most three lines', () => {
    const svg = titleCardSvg({
      preset: 'centered',
      text: 'A heading so long that it can never fit on a single line of this title card and then some more words on top',
      canvas,
    });

    expect(svg.match(/<text/g)).toHaveLength(3);
    expect(svg).toContain('...');
    expect(svg).toMatchSnapshot();
  });

  it('escapes the text', () => {
    expect(
      titleCardSvg({ preset: 'centered', text: 'R&D <hub>', canvas }),
    ).toContain('R&amp;D &lt;hub&gt;');
  });

  it('fills the frame with an opaque background', () => {
    expect(titleCardSvg({ preset: 'centered', text: 'Hi', canvas })).toContain(
      '<rect x="0" y="0" width="1920" height="1080" fill="#0b0b0f"/>',
    );
  });

  it('scales every dimension from the canvas', () => {
    const small = titleCardSvg({
      preset: 'centered',
      text: 'Attendance',
      canvas: { width: 1280, height: 720 },
    });

    expect(small).toContain('width="1280" height="720"');
    expect(small).toContain('font-size="65"');
    expect(small).toMatchSnapshot();
  });
});
