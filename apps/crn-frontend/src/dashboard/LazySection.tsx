import { ErrorBoundary } from '@asap-hub/frontend-utils';
import { Loading, useInView } from '@asap-hub/react-components';
import { FC, ReactNode, Suspense } from 'react';

type LazySectionProps = {
  /** Height reserved before load, to avoid layout jump. */
  minHeight?: number;
  children: ReactNode;
};

// Mounts (and fetches) its children only once near the viewport.
const LazySection: FC<LazySectionProps> = ({ minHeight = 200, children }) => {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div ref={ref} style={{ minHeight: inView ? undefined : minHeight }}>
      {inView && (
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

export default LazySection;
