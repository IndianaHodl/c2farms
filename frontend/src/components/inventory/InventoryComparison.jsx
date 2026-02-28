import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Alert, CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getGridColors } from '../../utils/gridColors';
import api from '../../services/api';

const fmtKg = (v) => v != null && v !== 0 ? Math.round(v).toLocaleString() : '';

export default function InventoryComparison({ farmId, snapshotDates }) {
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { mode } = useThemeMode();
  const colors = useMemo(() => getGridColors(mode), [mode]);

  // Auto-pick dates: earliest and latest
  useEffect(() => {
    if (snapshotDates.length >= 2) {
      setDate1(snapshotDates[snapshotDates.length - 1]); // oldest
      setDate2(snapshotDates[0]); // newest
    }
  }, [snapshotDates]);

  const fetchData = useCallback(async () => {
    if (!farmId || !date1 || !date2) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/farms/${farmId}/inventory/comparison?date1=${date1}&date2=${date2}`);
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }, [farmId, date1, date2]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dateLabel = (d) => d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  // Aggregate rows: commodity → {kg_date1, kg_date2, change}
  const rowData = useMemo(() => {
    if (!data) return [];
    // Pivot: one row per commodity with totals across locations
    const byComm = {};
    for (const r of data.rows) {
      if (!byComm[r.commodity]) byComm[r.commodity] = { commodity: r.commodity, kg_date1: 0, kg_date2: 0 };
      byComm[r.commodity].kg_date1 += r.kg_date1;
      byComm[r.commodity].kg_date2 += r.kg_date2;
    }
    const rows = Object.values(byComm).map(r => ({
      ...r,
      change_kg: r.kg_date2 - r.kg_date1,
      change_pct: r.kg_date1 !== 0 ? ((r.kg_date2 - r.kg_date1) / r.kg_date1) * 100 : 0,
    })).sort((a, b) => a.commodity.localeCompare(b.commodity));

    // Totals
    const total = { commodity: 'TOTAL', kg_date1: 0, kg_date2: 0, change_kg: 0, change_pct: 0 };
    for (const r of rows) {
      total.kg_date1 += r.kg_date1;
      total.kg_date2 += r.kg_date2;
      total.change_kg += r.change_kg;
    }
    total.change_pct = total.kg_date1 !== 0 ? ((total.change_kg) / total.kg_date1) * 100 : 0;
    rows.push(total);
    return rows;
  }, [data]);

  const columnDefs = useMemo(() => [
    { field: 'commodity', headerName: 'Commodity', width: 200 },
    { field: 'kg_date1', headerName: dateLabel(date1) + ' (KG)', width: 160, type: 'numericColumn', valueFormatter: p => fmtKg(p.value) },
    { field: 'kg_date2', headerName: dateLabel(date2) + ' (KG)', width: 160, type: 'numericColumn', valueFormatter: p => fmtKg(p.value) },
    {
      field: 'change_kg', headerName: 'Change (KG)', width: 140, type: 'numericColumn',
      valueFormatter: p => fmtKg(p.value),
      cellStyle: p => {
        if (!p.value || p.data?.commodity === 'TOTAL') return { fontWeight: p.data?.commodity === 'TOTAL' ? 'bold' : 'normal' };
        return { color: p.value > 0 ? '#4caf50' : p.value < 0 ? '#f44336' : 'inherit', fontWeight: p.data?.commodity === 'TOTAL' ? 'bold' : 'normal' };
      },
    },
    {
      field: 'change_pct', headerName: 'Change %', width: 110, type: 'numericColumn',
      valueFormatter: p => p.value != null ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` : '',
      cellStyle: p => {
        if (!p.value || p.data?.commodity === 'TOTAL') return { fontWeight: p.data?.commodity === 'TOTAL' ? 'bold' : 'normal' };
        return { color: p.value > 0 ? '#4caf50' : p.value < 0 ? '#f44336' : 'inherit', fontWeight: p.data?.commodity === 'TOTAL' ? 'bold' : 'normal' };
      },
    },
  ], [date1, date2]);

  const getRowStyle = useCallback((params) => {
    if (params.data?.commodity === 'TOTAL') {
      return { fontWeight: 'bold', borderTop: '2px solid #666' };
    }
    return null;
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>From Date</InputLabel>
          <Select value={date1} label="From Date" onChange={e => setDate1(e.target.value)}>
            {snapshotDates.map(d => (
              <MenuItem key={d} value={d}>{dateLabel(d)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography>to</Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>To Date</InputLabel>
          <Select value={date2} label="To Date" onChange={e => setDate2(e.target.value)}>
            {snapshotDates.map(d => (
              <MenuItem key={d} value={d}>{dateLabel(d)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !data || data.rows.length === 0 ? (
        <Alert severity="info">Select two dates to compare inventory levels.</Alert>
      ) : (
        <Box
          className={mode === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}
          sx={{ height: Math.min(500, (rowData.length + 1) * 42 + 48), width: '100%', ...colors }}
        >
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true, sortable: true }}
            getRowStyle={getRowStyle}
            domLayout={rowData.length <= 20 ? 'autoHeight' : undefined}
          />
        </Box>
      )}
    </Box>
  );
}
