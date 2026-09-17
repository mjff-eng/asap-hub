import { Router } from 'express';
import supertest from 'supertest';

import { appFactory } from '../../src/app';
import { authHandlerMock } from '../mocks/auth-handler.mock';
import { loggerMock } from '../mocks/logger.mock';

const mockSetTag = jest.fn();
jest.mock('@sentry/serverless', () => ({
  captureException: jest.fn(),
  configureScope: jest.fn((callback) => callback({ setTag: mockSetTag })),
}));

describe('Sentry Transaction Id  middleware', () => {
  const mockRoutes = Router();
  mockRoutes.get('/example', async (req, res) => res.json({ response: 'OK' }));

  const app = appFactory({
    logger: loggerMock,
    mockRequestHandlers: [mockRoutes],
    authHandler: authHandlerMock,
  });

  test('Should set transaction id scope on sentry if present on request', async () => {
    const response = await supertest(app)
      .get('/example')
      .set({ 'X-Transaction-Id': 'example-id' });

    expect(mockSetTag).toHaveBeenLastCalledWith('transaction_id', 'example-id');
    expect(response.status).toBe(200);
  });

  test('Should warn if the request is missing a transaction id', async () => {
    const response = await supertest(app).get('/example');
    expect(response.status).toBe(200);

    expect(loggerMock.warn).toHaveBeenLastCalledWith(
      'No transaction id on request to /example',
    );
  });
});
