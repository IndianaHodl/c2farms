import { Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';

export default function CropYieldCard({ crop }) {
  const yieldPct = crop?.yieldPct ?? 0;
  const pct = Math.min(yieldPct, 100);
  const color = yieldPct >= 100 ? 'success' : yieldPct >= 80 ? 'warning' : 'error';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight="bold" noWrap>
          {crop?.name || 'Unknown'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {crop?.acres || 0} acres
        </Typography>
        <Box sx={{ mt: 1.5, mb: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {crop?.actualYield ?? 0} / {crop?.targetYield ?? 0} bu/ac
          </Typography>
          <Typography variant="caption" fontWeight="bold" color={`${color}.main`}>
            {yieldPct}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
