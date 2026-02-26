import { Typography, Box } from '@mui/material';
import PerUnitGrid from '../components/per-unit/PerUnitGrid';
import { useFarm } from '../contexts/FarmContext';

export default function PerUnit() {
  const { currentFarm, fiscalYear } = useFarm();

  if (!currentFarm) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No farm selected.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Section 3: Per-Unit Analysis ($/acre)
      </Typography>
      <PerUnitGrid farmId={currentFarm.id} fiscalYear={fiscalYear} />
    </Box>
  );
}
