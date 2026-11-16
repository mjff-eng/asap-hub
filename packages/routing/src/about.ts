import { route } from 'typesafe-routes';

const initiative = route('/the-initiative', {}, {});
const whosInvolved = route('/whos-involved', {}, {});

export default route('/about', {}, { initiative, whosInvolved });
