import { createTheme } from '@mui/material/styles';

// Create a theme instance with dark colors that match the app's aesthetic
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4caf50', // Green color for profit elements
    },
    secondary: {
      main: '#ff6b6b', // Red color for negative/loss elements
    },
    background: {
      default: '#121212',
      paper: 'rgba(26, 26, 26, 0.8)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
    },
  },
  components: {
    // Customize the Tooltip component
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          fontSize: '0.85em',
          padding: '12px 16px',
          maxWidth: '320px',
        },
        arrow: {
          color: 'rgba(26, 26, 26, 0.95)',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h6: {
      fontSize: '1.1rem',
      fontWeight: 500,
      marginBottom: '8px',
    },
    body1: {
      fontSize: '0.9rem',
    },
    body2: {
      fontSize: '0.85rem',
      color: '#aaaaaa',
    },
  },
});

export default theme; 