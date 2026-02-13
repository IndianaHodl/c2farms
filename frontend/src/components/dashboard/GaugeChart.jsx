import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Box, Typography } from '@mui/material';

ChartJS.register(ArcElement, Tooltip);

export default function GaugeChart({ value, target, color }) {
  const safeValue = value ?? 0;
  const safeTarget = target || 100;
  const pct = Math.min(100, Math.max(0, (safeValue / safeTarget) * 100));
  const remaining = 100 - pct;

  const data = {
    datasets: [
      {
        data: [pct, remaining],
        backgroundColor: [color, '#e0e0e0'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      tooltip: { enabled: false },
    },
  };

  return (
    <Box sx={{ position: 'relative', height: 100, width: '100%' }}>
      <Doughnut data={data} options={options} />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ color }}>
          {safeValue.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
}
