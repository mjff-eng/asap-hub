import { Frame } from '@asap-hub/frontend-utils';
import {
  ResearchOutputDocumentType,
  ResearchOutputEntityType,
} from '@asap-hub/model';
import {
  BreadcrumbItem,
  ResearchOutputHeader,
  Toast,
  usePrevious,
} from '@asap-hub/react-components';
import { InnerToastContext } from '@asap-hub/react-context';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';

type OutputPageShellProps = {
  documentType: ResearchOutputDocumentType;
  entityType: ResearchOutputEntityType;
  isProjectOutput?: boolean;
  breadcrumbs?: ReadonlyArray<BreadcrumbItem>;
  banner?: ReactNode;
  children: ReactNode;
};

const OutputPageShell: React.FC<OutputPageShellProps> = ({
  documentType,
  entityType,
  isProjectOutput = false,
  breadcrumbs,
  banner,
  children,
}) => {
  const [toastNode, setToastNode] = useState<ReactNode>(undefined);
  const toast = useCallback((node: ReactNode) => setToastNode(node), []);
  const previousToast = usePrevious(toastNode);

  useEffect(() => {
    if (toastNode !== previousToast) {
      window.scrollTo(0, 0);
    }
  }, [toastNode, previousToast]);

  return (
    <Frame title="Share Research Output">
      {banner}
      <InnerToastContext.Provider value={toast}>
        {toastNode && (
          <Toast accent="error" onClose={() => setToastNode(undefined)}>
            {toastNode}
          </Toast>
        )}
        <ResearchOutputHeader
          documentType={documentType}
          entityType={entityType}
          isProjectOutput={isProjectOutput}
          breadcrumbs={breadcrumbs}
        />
        {children}
      </InnerToastContext.Provider>
    </Frame>
  );
};

export default OutputPageShell;
