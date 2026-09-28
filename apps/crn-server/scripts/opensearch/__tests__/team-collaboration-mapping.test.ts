import { metricConfig } from '../constants';

describe('team-collaboration index mapping', () => {
  test('Should map id as a keyword so a term filter can match a team id', () => {
    expect(
      metricConfig['team-collaboration'].mapping.properties,
    ).toHaveProperty('id', { type: 'keyword' });
  });
});
