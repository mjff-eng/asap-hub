import { ThemeProvider } from '@emotion/react';
import components from './components';

const theme = {
  components,
};

const Theme: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <div data-app="gp2" style={{ display: 'contents' }}>
      {children}
    </div>
  </ThemeProvider>
);

export default Theme;
