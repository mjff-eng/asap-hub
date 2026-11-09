import { BiographyQuestionsModal } from '@asap-hub/react-components';
import { StaticRouter } from 'react-router';

export default {
  title: 'Templates / User Profile / Biography Questions Modal',
  component: BiographyQuestionsModal,
};

const questions = [
  'Are alpha-synuclein deposits the cause or consequence of something deeper wrong with neurons?',
  'How much do we have to knock down extracellular alpha-synuclein to measurably slow cell to cell transmission (if this approach even works)?',
];

export const Normal = () => (
  <StaticRouter location="/">
    <BiographyQuestionsModal
      biography="My Bio"
      questions={questions}
      role="Grantee"
      backHref="#"
    />
  </StaticRouter>
);

export const Staff = () => (
  <StaticRouter location="/">
    <BiographyQuestionsModal
      biography="My Bio"
      questions={[]}
      role="Staff"
      backHref="#"
    />
  </StaticRouter>
);
