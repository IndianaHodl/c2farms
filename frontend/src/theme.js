import { createTheme } from '@mui/material/styles';

export function getThemeOptions(mode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#2e7d32' },
      secondary: { main: '#f9a825' },
      ...(mode === 'light'
        ? {
            background: { default: '#f5f5f5', paper: '#ffffff' },
          }
        : {
            background: { default: '#121212', paper: '#1e1e1e' },
          }),
      success: { main: '#4caf50' },
      warning: { main: '#ff9800' },
      error: { main: '#f44336' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
    },
  });
}

// Default export for backwards compat
const theme = getThemeOptions('light');
export default theme;
