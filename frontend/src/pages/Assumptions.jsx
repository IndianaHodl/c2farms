import { Typography, Paper, Box } from '@mui/material';
import AssumptionsForm from '../components/assumptions/AssumptionsForm';
import { useFarm } from '../contexts/FarmContext';

export default function Assumptions() {
  const { currentFarm, fiscalYear } = useFarm();

  if (!currentFarm) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No farm selected. Please select a farm from the header.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Section 1: Assumptions & Budget Setup
      </Typography>
      <Paper sx={{ p: 3 }}>
        <AssumptionsForm farmId={currentFarm.id} fiscalYear={fiscalYear} />
      </Paper>
    </Box>
  );
}
