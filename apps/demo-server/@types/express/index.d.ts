import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AuthenticatedUser, Claims } from '../../src/auth';

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context?: APIGatewayProxyEventV2['requestContext'];
      claims?: Claims;
      user?: AuthenticatedUser;
    }
  }
}
