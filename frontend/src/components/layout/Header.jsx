import { AppBar, Toolbar, Typography, Button, Select, MenuItem, Box, IconButton } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useAuth } from '../../contexts/AuthContext';
import { useFarm } from '../../contexts/FarmContext';
import { useThemeMode } from '../../contexts/ThemeContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { currentFarm, farms, setCurrentFarm, fiscalYear, setFiscalYear } = useFarm();
  const { mode, toggleMode } = useThemeMode();

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ bgcolor: 'background.paper' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 700 }}>
          C2 Farms
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {farms.length > 0 && (
            <Select
              size="small"
              value={currentFarm?.id || ''}
              onChange={(e) => {
                const farm = farms.find(f => f.id === e.target.value);
                setCurrentFarm(farm);
              }}
            >
              {farms.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </Select>
          )}

          <Select
            size="small"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <MenuItem key={y} value={y}>FY {y}</MenuItem>
            ))}
          </Select>

          <IconButton onClick={toggleMode} size="small">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <Typography variant="body2" color="text.secondary">
            {user?.name}
          </Typography>

          <Button size="small" onClick={logout}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
