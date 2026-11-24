import supertest from 'supertest';
import { appFactory } from '../../src/app';
import { getDiscoverResponse } from '../fixtures/discover.fixtures';
import { authHandlerMock } from '../mocks/auth-handler.mock';
import { discoverControllerMock } from '../mocks/discover.controller.mock';
import { loggerMock } from '../mocks/logger.mock';

describe('/discover/ route', () => {
  const app = appFactory({
    discoverController: discoverControllerMock,
    authHandler: authHandlerMock,
    logger: loggerMock,
  });

  describe('GET /discover', () => {
    test('Should return 200 when no information exists', async () => {
      discoverControllerMock.fetch.mockResolvedValueOnce({
        aboutUs: '',
        members: [],
        scientificAdvisoryBoard: [],
        asapAreas: [],
      });

      const response = await supertest(app).get('/discover');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        aboutUs: '',
        members: [],
        scientificAdvisoryBoard: [],
        asapAreas: [],
      });
    });

    test('Should return the results correctly', async () => {
      const discoverResponse = getDiscoverResponse();
      discoverControllerMock.fetch.mockResolvedValueOnce(discoverResponse);

      const response = await supertest(app).get('/discover');

      expect(response.body).toEqual(discoverResponse);
    });
  });
});
