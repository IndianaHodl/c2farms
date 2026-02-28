import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Box, Alert, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getGridColors } from '../../utils/gridColors';
import api from '../../services/api';

const formatNum = (v) => v != null && v !== 0 ? Math.round(v).toLocaleString() : '';

export default function InventoryGrid({ farmId, date, canEdit: _canEdit }) {
  const [rowData, setRowData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCommodity, setFilterCommodity] = useState('');
  const [error, setError] = useState('');
  const gridRef = useRef();
  const { mode } = useThemeMode();
  const colors = useMemo(() => getGridColors(mode), [mode]);

  const fetchData = useCallback(async () => {
    if (!farmId || !date) return;
    try {
      const params = new URLSearchParams({ date });
      if (filterLocation) params.set('location', filterLocation);
      const res = await api.get(`/api/farms/${farmId}/inventory/snapshots?${params}`);
      setRowData(res.data.map(s => ({
        id: s.id,
        location: s.bin?.location?.name || '',
        locationId: s.bin?.location?.id || '',
        binNumber: s.bin?.bin_number || '',
        binType: s.bin?.bin_type || '',
        sizeBu: s.bin?.size_bu,
        commodity: s.commodity || '',
        bushels: s.bushels,
        kg: s.kg,
        cropYear: s.crop_year,
        notes: s.notes || '',
      })));
      setError('');
    } catch {
      setError('Failed to load snapshot data');
    }
  }, [farmId, date, filterLocation]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!farmId) return;
    api.get(`/api/farms/${farmId}/inventory/locations`).then(r => setLocations(r.data)).catch(() => {});
  }, [farmId]);

  const commodities = useMemo(() => {
    const set = new Set(rowData.map(r => r.commodity).filter(Boolean));
    return [...set].sort();
  }, [rowData]);

  const filteredData = useMemo(() => {
    let d = rowData;
    if (filterCommodity) d = d.filter(r => r.commodity === filterCommodity);
    return d;
  }, [rowData, filterCommodity]);

  const columnDefs = useMemo(() => [
    { field: 'location', headerName: 'Location', width: 120, rowGroup: false },
    { field: 'binNumber', headerName: 'Bin #', width: 80 },
    { field: 'binType', headerName: 'Type', width: 140 },
    { field: 'sizeBu', headerName: 'Size (bu)', width: 100, valueFormatter: p => formatNum(p.value) },
    { field: 'commodity', headerName: 'Commodity', width: 220 },
    { field: 'bushels', headerName: 'Bushels', width: 110, valueFormatter: p => formatNum(p.value), type: 'numericColumn' },
    { field: 'kg', headerName: 'KG', width: 120, valueFormatter: p => formatNum(p.value), type: 'numericColumn' },
    { field: 'cropYear', headerName: 'Crop Year', width: 100 },
    { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 150 },
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  // Totals row
  const totalBu = filteredData.reduce((sum, r) => sum + (r.bushels || 0), 0);
  const totalKg = filteredData.reduce((sum, r) => sum + (r.kg || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Location</InputLabel>
          <Select value={filterLocation} label="Location" onChange={e => setFilterLocation(e.target.value)}>
            <MenuItem value="">All Locations</MenuItem>
            {locations.map(l => (
              <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Commodity</InputLabel>
          <Select value={filterCommodity} label="Commodity" onChange={e => setFilterCommodity(e.target.value)}>
            <MenuItem value="">All Commodities</MenuItem>
            {commodities.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Chip label={`${filteredData.length} bins`} size="small" />
        <Chip label={`${formatNum(totalBu)} bu`} size="small" variant="outlined" />
        <Chip label={`${formatNum(totalKg)} kg`} size="small" variant="outlined" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        className={mode === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}
        sx={{ height: 600, width: '100%', ...colors }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          getRowId={p => p.data.id}
        />
      </Box>
    </Box>
  );
}
