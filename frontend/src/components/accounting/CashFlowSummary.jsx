import { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getGridColors } from '../../utils/gridColors';
import { FISCAL_MONTHS } from '../../utils/fiscalYear';
import { formatCurrency } from '../../utils/formatting';

export default function CashFlowSummary({ summary }) {
  const { mode } = useThemeMode();
  const colors = useMemo(() => getGridColors(mode), [mode]);

  if (!summary || Object.keys(summary).length === 0) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Monthly Cash Flow Summary</Typography>
      <Grid container spacing={1}>
        {FISCAL_MONTHS.map(month => {
          const s = summary[month] || {};
          const isPositive = (s.operatingIncome || 0) >= 0;
          return (
            <Grid item xs={6} sm={3} md={2} lg={1} key={month}>
              <Card
                sx={{
                  bgcolor: isPositive ? colors.cashFlowPositiveBg : colors.cashFlowNegativeBg,
                  border: `1px solid ${isPositive ? colors.cashFlowPositiveBorder : colors.cashFlowNegativeBorder}`,
                }}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" color="text.secondary">{month}</Typography>
                  <Typography variant="body2" fontWeight="bold" color={isPositive ? 'success.main' : 'error.main'}>
                    {formatCurrency(s.operatingIncome || 0, 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
