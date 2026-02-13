import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableHead, TableBody, TableRow, TableCell, Select, MenuItem, Alert,
  FormControl, InputLabel,
} from '@mui/material';
import { FISCAL_MONTHS } from '../../utils/fiscalYear';
import { LEAF_CATEGORIES } from '../../utils/categoryList';
import api from '../../services/api';

// Try to auto-detect which CSV column is the account name
function detectAccountColumn(headers) {
  const accountPatterns = ['account', 'name', 'category', 'description', 'item'];
  for (const h of headers) {
    if (accountPatterns.some(p => h.toLowerCase().includes(p))) return h;
  }
  return headers[0]; // fallback to first column
}

// Try to auto-detect month columns
function detectMonthColumns(headers) {
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];
  const shortToFiscal = {
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
    jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
    january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr',
    june: 'Jun', july: 'Jul', august: 'Aug', september: 'Sep',
    october: 'Oct', november: 'Nov', december: 'Dec',
  };

  const mapping = {};
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    for (const m of monthNames) {
      if (lower.includes(m)) {
        mapping[h] = shortToFiscal[m];
        break;
      }
    }
  }
  return mapping;
}

export default function CsvImportDialog({ open, onClose, csvData, farmId, fiscalYear, onImportComplete }) {
  const headers = csvData?.meta?.fields || [];
  const rows = csvData?.data || [];

  const [accountCol, setAccountCol] = useState(() => detectAccountColumn(headers));
  const [monthMapping, setMonthMapping] = useState(() => detectMonthColumns(headers));
  const [rowMapping, setRowMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  // Columns that are mapped to a fiscal month
  const mappedMonthCols = useMemo(() =>
    Object.entries(monthMapping).filter(([, fm]) => fm),
    [monthMapping]
  );

  // Get unique account names from CSV
  const csvAccounts = useMemo(() => {
    const accounts = rows.map(r => r[accountCol]).filter(Boolean);
    return [...new Set(accounts)];
  }, [rows, accountCol]);

  const handleMonthMap = (csvCol, fiscalMonth) => {
    setMonthMapping(prev => ({ ...prev, [csvCol]: fiscalMonth || '' }));
  };

  const handleRowMap = (csvAccountName, categoryCode) => {
    setRowMapping(prev => ({ ...prev, [csvAccountName]: categoryCode || '' }));
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');

    try {
      // Build import rows: group by month
      const monthData = {};
      for (const row of rows) {
        const acctName = row[accountCol];
        const catCode = rowMapping[acctName];
        if (!catCode) continue;

        for (const [csvCol, fiscalMonth] of Object.entries(monthMapping)) {
          if (!fiscalMonth) continue;
          const rawVal = row[csvCol];
          if (rawVal === undefined || rawVal === '') continue;
          // Parse number, removing commas and currency symbols
          const val = parseFloat(String(rawVal).replace(/[$,]/g, '')) || 0;
          if (val === 0) continue;

          if (!monthData[fiscalMonth]) monthData[fiscalMonth] = {};
          monthData[fiscalMonth][catCode] = (monthData[fiscalMonth][catCode] || 0) + val;
        }
      }

      const importRows = Object.entries(monthData).map(([month, data]) => ({
        fiscal_year: fiscalYear,
        month,
        data,
      }));

      if (importRows.length === 0) {
        setError('No data to import. Map at least one account row and one month column.');
        setImporting(false);
        return;
      }

      await api.post(`/api/farms/${farmId}/accounting/import-csv`, { rows: importRows });
      onImportComplete?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const mappedRowCount = Object.values(rowMapping).filter(Boolean).length;
  const mappedMonthCount = Object.values(monthMapping).filter(Boolean).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import CSV - Map Columns to Categories</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {rows.length} rows found. {mappedRowCount} accounts mapped, {mappedMonthCount} months mapped.
        </Typography>

        {/* Account column selector */}
        <FormControl size="small" sx={{ mb: 2, minWidth: 200 }}>
          <InputLabel>Account Name Column</InputLabel>
          <Select value={accountCol} label="Account Name Column" onChange={(e) => setAccountCol(e.target.value)}>
            {headers.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Month column mapping */}
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Month Column Mapping</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {headers.filter(h => h !== accountCol).map(h => (
            <FormControl key={h} size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{h}</InputLabel>
              <Select
                value={monthMapping[h] || ''}
                label={h}
                onChange={(e) => handleMonthMap(h, e.target.value)}
              >
                <MenuItem value="">Skip</MenuItem>
                {FISCAL_MONTHS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          ))}
        </Box>

        {/* Row mapping & preview */}
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Account Mapping</Typography>
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>CSV Account</TableCell>
                <TableCell>Map to Category</TableCell>
                {mappedMonthCols.map(([col, fm]) => (
                  <TableCell key={col} align="right">{fm}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {csvAccounts.map(acct => {
                const csvRow = rows.find(r => r[accountCol] === acct);
                return (
                  <TableRow key={acct}>
                    <TableCell>{acct}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={rowMapping[acct] || ''}
                        onChange={(e) => handleRowMap(acct, e.target.value)}
                        displayEmpty
                        sx={{ minWidth: 180 }}
                      >
                        <MenuItem value="">Skip</MenuItem>
                        {LEAF_CATEGORIES.map(c => (
                          <MenuItem key={c.code} value={c.code}>{c.display_name}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    {mappedMonthCols.map(([col]) => (
                      <TableCell key={col} align="right">
                        {csvRow?.[col] ?? ''}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={importing || mappedRowCount === 0 || mappedMonthCount === 0}
        >
          {importing ? 'Importing...' : `Import ${mappedRowCount} Accounts`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
