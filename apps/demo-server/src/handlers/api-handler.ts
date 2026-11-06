/* istanbul ignore file */
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Request as RequestExpress } from 'express';
import serverlessHttp from 'serverless-http';
import { appFactory } from '../app';

const app = appFactory();

interface RequestWithContext extends RequestExpress {
  context: APIGatewayProxyEventV2['requestContext'];
}

const TEXT_CONTENT_TYPE =
  /^(?:text\/|application\/(?:json|x-ndjson|javascript|xml|vnd\.apple\.mpegurl)$)/;

const BINARY_ENCODINGS = ['gzip', 'deflate', 'br'];

// passing `binary` as a function replaces serverless-http's own detection
// rather than adding to it, so its content-encoding check has to be repeated
// here or a compressed body would be utf8 decoded
const isBinaryEncoding = (headers: Record<string, string>): boolean =>
  (headers['content-encoding'] ?? '')
    .split(',')
    .some((value) =>
      BINARY_ENCODINGS.some((encoding) => value.includes(encoding)),
    );

// serverless-http utf8 decodes whatever it is not told is binary, which would
// replace every non-utf8 byte the local /media route streams
const isBinaryResponse = (headers: Record<string, string>): boolean => {
  if (isBinaryEncoding(headers)) {
    return true;
  }
  const [mediaType = ''] = (headers['content-type'] ?? '').split(';');
  const contentType = mediaType.trim().toLowerCase();
  // S3 need not label an object, and /media serves whatever it is given, so an
  // unlabelled body is bytes until something says otherwise
  return !TEXT_CONTENT_TYPE.test(contentType);
};

export const apiHandler = serverlessHttp(app, {
  binary: isBinaryResponse,
  request(request: RequestWithContext, event: APIGatewayProxyEventV2) {
    request.context = event.requestContext;
  },
});
