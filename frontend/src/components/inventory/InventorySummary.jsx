import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getGridColors } from '../../utils/gridColors';
import api from '../../services/api';

const fmtKg = (v) => v != null && v !== 0 ? Math.round(v).toLocaleString() : '';

export default function InventorySummary({ farmId, date }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { mode } = useThemeMode();
  const colors = useMemo(() => getGridColors(mode), [mode]);

  const fetchData = useCallback(async () => {
    if (!farmId || !date) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/farms/${farmId}/inventory/summary?date=${date}`);
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [farmId, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columnDefs = useMemo(() => {
    if (!data) return [];
    const cols = [
      { field: 'commodity', headerName: 'Commodity', width: 180, pinned: 'left' },
    ];
    for (const loc of data.locations) {
      cols.push({
        field: loc,
        headerName: loc,
        width: 130,
        type: 'numericColumn',
        valueFormatter: p => fmtKg(p.value),
      });
    }
    cols.push({
      field: 'total',
      headerName: 'Total',
      width: 140,
      type: 'numericColumn',
      pinned: 'right',
      valueFormatter: p => fmtKg(p.value),
      cellStyle: { fontWeight: 'bold' },
    });
    return cols;
  }, [data]);

  const rowData = useMemo(() => {
    if (!data) return [];
    const rows = data.commodities.map(comm => {
      const row = { commodity: comm };
      for (const loc of data.locations) {
        row[loc] = data.matrix[comm]?.[loc] || 0;
      }
      row.total = data.commodityTotals[comm] || 0;
      return row;
    });
    // Totals row
    const totalRow = { commodity: 'TOTAL' };
    for (const loc of data.locations) {
      totalRow[loc] = data.locationTotals[loc] || 0;
    }
    totalRow.total = data.grandTotal || 0;
    rows.push(totalRow);
    return rows;
  }, [data]);

  const getRowStyle = useCallback((params) => {
    if (params.data?.commodity === 'TOTAL') {
      return { fontWeight: 'bold', borderTop: '2px solid #666' };
    }
    return null;
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data || data.commodities.length === 0) return <Alert severity="info">No data for this date.</Alert>;

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Crop x Location (KG) — Grand Total: {Math.round(data.grandTotal).toLocaleString()} kg
      </Typography>
      <Box
        className={mode === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}
        sx={{ height: Math.min(400, (rowData.length + 1) * 42 + 48), width: '100%', ...colors }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true }}
          getRowStyle={getRowStyle}
          domLayout={rowData.length <= 15 ? 'autoHeight' : undefined}
        />
      </Box>
    </Box>
  );
}
