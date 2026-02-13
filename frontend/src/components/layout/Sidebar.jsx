import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DashboardIcon from '@mui/icons-material/Dashboard';

const NAV_ITEMS = [
  { label: '1. Assumptions', path: '/assumptions', icon: <SettingsIcon /> },
  { label: '2. Per-Unit', path: '/per-unit', icon: <TableChartIcon /> },
  { label: '3. Accounting', path: '/accounting', icon: <AccountBalanceIcon /> },
  { label: '4. Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
];

export default function Sidebar({ width }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width, boxSizing: 'border-box', borderRight: (theme) => `1px solid ${theme.palette.divider}` },
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <img
          src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='70' font-size='60'>🌾</text></svg>"
          alt="logo"
          style={{ width: 48, height: 48 }}
        />
      </Box>
      <Divider />
      <List>
        {NAV_ITEMS.map(item => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              mx: 1,
              borderRadius: 2,
              mb: 0.5,
              '&.Mui-selected': { bgcolor: 'primary.light', color: 'white' },
              '&.Mui-selected:hover': { bgcolor: 'primary.main' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
