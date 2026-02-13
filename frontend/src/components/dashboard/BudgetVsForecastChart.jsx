import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Box, Typography } from '@mui/material';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function BudgetVsForecastChart({ chartData }) {
  if (!chartData || !chartData.labels?.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No forecast data available. Freeze the budget first.</Typography>
      </Box>
    );
  }

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Frozen Budget',
        data: chartData.budget,
        backgroundColor: 'rgba(46, 125, 50, 0.7)',
      },
      {
        label: 'Forecast',
        data: chartData.forecast,
        backgroundColor: 'rgba(249, 168, 37, 0.7)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Budget vs Forecast by Category' },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${(value / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return (
    <Box sx={{ height: 350 }}>
      <Bar data={data} options={options} />
    </Box>
  );
}
