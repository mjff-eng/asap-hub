import { ExternalAuthorDataProvider } from '../data-providers/types/external-authors.data-provider.types';

export const createExternalAuthorOncePerName = (
  externalAuthorDataProvider: ExternalAuthorDataProvider,
) => {
  const idsByName = new Map<string, Promise<string>>();

  return (name: string): Promise<string> => {
    const externalAuthorId =
      idsByName.get(name) ?? externalAuthorDataProvider.create({ name });
    idsByName.set(name, externalAuthorId);
    return externalAuthorId;
  };
};
