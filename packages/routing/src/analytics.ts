import { route, stringParser } from 'typesafe-routes';

const metric = route('/:metric', { metric: stringParser }, {});
const collaborationPath = route(
  '/:metric/:type?',
  { metric: stringParser, type: stringParser },
  {},
);

const collaboration = route('/collaboration', {}, { collaborationPath });

const leadership = route('/leadership', {}, { metric });

const openScience = route('/open-science', {}, { metric });

const productivity = route('/productivity', {}, { metric });

const engagement = route('/engagement', {}, { metric });

const awards = route('/awards', {}, { metric });

export default route(
  '/analytics',
  {},
  {
    collaboration,
    leadership,
    productivity,
    engagement,
    openScience,
    awards,
  },
);
