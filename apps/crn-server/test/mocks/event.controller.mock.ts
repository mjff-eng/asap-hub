import EventController from '../../src/controllers/event.controller';

export const eventControllerMock = {
  create: jest.fn(),
  fetch: jest.fn(),
  fetchById: jest.fn(),
  fetchByGoogleId: jest.fn(),
  update: jest.fn(),
  updateEventDetails: jest.fn(),
  createAttendeesFile: jest.fn(),
} as unknown as jest.Mocked<EventController>;
