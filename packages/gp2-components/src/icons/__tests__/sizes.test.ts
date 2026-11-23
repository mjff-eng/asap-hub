import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Icons sized in px ignore the browser font size setting while the text next
// to them follows it. Size the <svg> in rem (remUnit for numeric props) and give
// it a viewBox so its contents scale with it.
const iconsDir = join(__dirname, '..');
const iconFiles = readdirSync(iconsDir).filter((file) => file.endsWith('.tsx'));

it('finds the icon files', () => {
  expect(iconFiles.length).toBeGreaterThan(0);
});

describe.each(iconFiles)('%s', (file) => {
  const source = readFileSync(join(iconsDir, file), 'utf8');
  const svgTags = source.match(/<svg\b[^>]*>/g) ?? [];

  it('sizes every <svg> in rem', () => {
    svgTags.forEach((tag) => {
      const sizes = [
        ...tag.matchAll(/\b(?:width|height)=(\{[^}]*\}|"[^"]*")/g),
      ].map(([, value]) => value);
      sizes.forEach((value) => {
        expect(value).toMatch(/rem|^"100%"$/);
      });
    });
  });

  it('gives every sized <svg> a viewBox', () => {
    svgTags
      .filter((tag) => /\b(?:width|height)=/.test(tag))
      .forEach((tag) => {
        expect(tag).toMatch(/\bviewBox=/);
      });
  });
});
