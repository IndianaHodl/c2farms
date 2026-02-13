import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import GaugeChart from './GaugeChart';

export default function KPICard({ kpi }) {
  const { label, value, unit, gauge, target, color, mock } = kpi;

  // Guard against null/undefined values
  const safeValue = value ?? 0;

  const displayValue = unit === '%'
    ? `${safeValue.toFixed(1)}%`
    : unit === '$/ac'
      ? `$${safeValue.toFixed(2)}/ac`
      : safeValue.toFixed(2);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {label}
          {mock && <Chip label="N/A" size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />}
        </Typography>

        {mock ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" color="text.disabled">
              --
            </Typography>
          </Box>
        ) : gauge ? (
          <GaugeChart value={safeValue} target={target || 100} color={color} />
        ) : (
          <Box sx={{ py: 2 }}>
            <Typography variant="h4" sx={{ color, fontWeight: 700 }}>
              {displayValue}
            </Typography>
          </Box>
        )}

        {!gauge && !mock && (
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
