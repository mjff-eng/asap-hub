import { Link, Toast } from '@asap-hub/react-components';
import { useDismissable } from '../hooks';

const COSA_BANNER_DISMISSED_KEY = 'crn-cosa-banner-dismissed';
const COSA_WEBSITE_URL = 'https://event.fourwaves.com/asapcosa2026';

export const CosaBanner = () => {
  const [isDismissed, handleDismiss] = useDismissable(
    COSA_BANNER_DISMISSED_KEY,
  );

  if (isDismissed) {
    return null;
  }

  return (
    <Toast accent="info" onClose={handleDismiss}>
      COSA is currently live! Access the event through the{' '}
      <Link href={COSA_WEBSITE_URL}>COSA website</Link>.
    </Toast>
  );
};
