import { TeamProductivityOpensearchDocument } from '@asap-hub/model';

import { getWithinTeamCoProduction } from '../getWithinTeamCoProduction';

const productivity = (article: number) =>
  ({ Article: article }) as TeamProductivityOpensearchDocument;

describe('getWithinTeamCoProduction', () => {
  describe('computable percentages', () => {
    test('Should return 90 when nine of ten articles were co-produced', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 9 }, productivity(10)),
      ).toBe(90);
    });

    test('Should return exactly 80 when eight of ten were co-produced', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 8 }, productivity(10)),
      ).toBe(80);
    });

    test('Should return exactly 50 when five of ten were co-produced', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 5 }, productivity(10)),
      ).toBe(50);
    });

    test('Should round 79.6% up to 80', () => {
      expect(
        getWithinTeamCoProduction(
          { coProducedArticles: 796 },
          productivity(1000),
        ),
      ).toBe(80);
    });

    test('Should return 0 when the team co-produced none of its articles', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 0 }, productivity(10)),
      ).toBe(0);
    });
  });

  describe('not-computable cases', () => {
    test('Should return null when the team has no articles', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 0 }, productivity(0)),
      ).toBeNull();
    });

    test('Should return null when no co-production figure is available', () => {
      expect(
        getWithinTeamCoProduction(
          { coProducedArticles: undefined },
          productivity(10),
        ),
      ).toBeNull();
    });

    test('Should return null when no productivity document is available', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 4 }, undefined),
      ).toBeNull();
    });

    test('Should return null rather than a figure above 100 when the count exceeds the total', () => {
      expect(
        getWithinTeamCoProduction({ coProducedArticles: 11 }, productivity(10)),
      ).toBeNull();
    });
  });
});
