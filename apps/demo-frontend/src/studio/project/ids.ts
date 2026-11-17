let counter = 0;

// ids only have to be unique inside one timeline document, and keeping them
// short keeps the saved document readable
export const createId = (prefix: string): string => {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
};
