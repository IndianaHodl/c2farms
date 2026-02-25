import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Alert, TextField, FormControl, InputLabel, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, Paper, Typography,
} from '@mui/material';
import api from '../../services/api';
import { FISCAL_MONTHS } from '../../utils/fiscalYear';
import { formatCurrency } from '../../utils/formatting';

export default function GlDetailView({ farmId, fiscalYear, months: propMonths }) {
  const [actuals, setActuals] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const months = propMonths || FISCAL_MONTHS;

  const fetchData = useCallback(async () => {
    if (!farmId || !fiscalYear) return;
    try {
      const res = await api.get(`/api/farms/${farmId}/gl-actuals/${fiscalYear}`);
      setActuals(res.data.actuals || []);
    } catch {
      setError('Failed to load GL detail data');
    }
  }, [farmId, fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group actuals by GL account
  const accountRows = useMemo(() => {
    const map = new Map();
    for (const a of actuals) {
      const key = a.account_number;
      if (!map.has(key)) {
        map.set(key, {
          account_number: a.account_number,
          account_name: a.account_name,
          category_code: a.category_code,
          category_name: a.category_name,
          months: {},
          total: 0,
        });
      }
      const row = map.get(key);
      row.months[a.month] = (row.months[a.month] || 0) + a.amount;
      row.total += a.amount;
    }
    return [...map.values()].sort((a, b) => a.account_number.localeCompare(b.account_number));
  }, [actuals]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const set = new Set(accountRows.map(r => r.category_name).filter(Boolean));
    return [...set].sort();
  }, [accountRows]);

  // Filter
  const filtered = useMemo(() => {
    return accountRows.filter(r => {
      if (search && !r.account_name.toLowerCase().includes(search.toLowerCase())
        && !r.account_number.includes(search)) {
        return false;
      }
      if (categoryFilter && r.category_name !== categoryFilter) return false;
      return true;
    });
  }, [accountRows, search, categoryFilter]);

  if (actuals.length === 0 && !error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No GL actual data yet. Import QBO data or use the GL Import feature.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          label="Search accounts"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Category Filter</InputLabel>
          <Select
            value={categoryFilter}
            label="Category Filter"
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {filtered.length} account{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Paper sx={{ overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                Account #
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Account Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              {months.map(m => (
                <TableCell key={m} align="right" sx={{ fontWeight: 'bold' }}>{m}</TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(row => (
              <TableRow key={row.account_number} hover>
                <TableCell sx={{ fontFamily: 'monospace', position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                  {row.account_number}
                </TableCell>
                <TableCell>{row.account_name}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{row.category_name}</TableCell>
                {months.map(m => (
                  <TableCell key={m} align="right">
                    {row.months[m] ? formatCurrency(row.months[m], 0) : '-'}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(row.total, 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
