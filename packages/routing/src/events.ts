import { route, stringParser } from 'typesafe-routes';

const calendar = route('/calendar', {}, {});
const upcoming = route('/upcoming', {}, {});
const past = route('/past', {}, {});

const about = route('/about', {}, {});
const meetingMaterials = route('/meeting-materials', {}, {});

const event = route(
  '/:eventId',
  { eventId: stringParser },
  { about, meetingMaterials },
);

const events = route('/events', {}, { event, calendar, upcoming, past });

export default events;
