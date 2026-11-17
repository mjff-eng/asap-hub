import { act } from '@testing-library/react';

jest.mock('../App', () => ({
  __esModule: true,
  default: () => <p>the demo app</p>,
}));

afterEach(() => {
  document.body.innerHTML = '';
});

it('mounts the app into the root element', async () => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);

  await act(async () => {
    await import('../index');
  });

  expect(root).toHaveTextContent('the demo app');
});

it('refuses to start without a root element', async () => {
  jest.resetModules();

  await expect(import('../index')).rejects.toThrow('Root element not found');
});
