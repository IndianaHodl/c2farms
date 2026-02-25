import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableHead, TableBody, TableRow, TableCell, Select, MenuItem, Alert,
  FormControl, InputLabel,
} from '@mui/material';
import { FISCAL_MONTHS } from '../../utils/fiscalYear';
import { fetchFarmCategories, LEAF_CATEGORIES } from '../../utils/categoryList';
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
  const [leafCategories, setLeafCategories] = useState(LEAF_CATEGORIES);

  // Load farm-specific categories
  useEffect(() => {
    if (farmId) {
      fetchFarmCategories(farmId)
        .then(cats => { if (cats.length > 0) setLeafCategories(cats); })
        .catch(() => { /* keep static fallback */ });
    }
  }, [farmId]);

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

  // Pre-populate row mappings from previously-imported GL accounts
  useEffect(() => {
    if (!farmId || csvAccounts.length === 0) return;
    api.get(`/api/farms/${farmId}/gl-accounts`)
      .then(resp => {
        const glAccounts = resp.data?.glAccounts || [];
        if (glAccounts.length === 0) return;
        // Build lookup: account name/number → category code
        const saved = {};
        for (const gl of glAccounts) {
          if (gl.category?.code) {
            saved[gl.account_name] = gl.category.code;
            saved[gl.account_number] = gl.category.code;
          }
        }
        // Apply to any CSV accounts that match
        setRowMapping(prev => {
          const merged = { ...prev };
          for (const acct of csvAccounts) {
            if (!merged[acct] && saved[acct]) {
              merged[acct] = saved[acct];
            }
          }
          return merged;
        });
      })
      .catch(() => { /* ignore - user can still map manually */ });
  }, [farmId, csvAccounts]);

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
      // Build account-level detail: each CSV account becomes a GL account
      const accountData = {};
      for (const row of rows) {
        const acctName = row[accountCol];
        const catCode = rowMapping[acctName];
        if (!catCode) continue;

        if (!accountData[acctName]) {
          accountData[acctName] = { category_code: catCode, months: {} };
        }

        for (const [csvCol, fiscalMonth] of Object.entries(monthMapping)) {
          if (!fiscalMonth) continue;
          const rawVal = row[csvCol];
          if (rawVal === undefined || rawVal === '') continue;
          // Parse number, removing commas and currency symbols
          const cleaned = String(rawVal).replace(/[$,]/g, '').trim();
          const val = cleaned === '' ? NaN : parseFloat(cleaned);
          if (isNaN(val)) continue;

          accountData[acctName].months[fiscalMonth] =
            (accountData[acctName].months[fiscalMonth] || 0) + val;
        }
      }

      const accounts = Object.entries(accountData)
        .map(([name, data]) => ({
          name,
          category_code: data.category_code,
          months: data.months,
        }));

      if (accounts.length === 0) {
        setError('No data to import. Map at least one account row and one month column.');
        setImporting(false);
        return;
      }

      const payload = { fiscal_year: fiscalYear, accounts };
      console.log('[CSV Import] Sending payload:', JSON.stringify(payload, null, 2));

      const resp = await api.post(`/api/farms/${farmId}/accounting/import-csv`, payload);
      const result = resp.data;

      if (result.skipped > 0) {
        console.warn(`[CSV Import] ${result.skipped} account(s) skipped:`, result.skippedDetails);
      }
      console.log(`[CSV Import] Success: imported ${result.imported} account(s) across ${result.months} month(s)`);

      onImportComplete?.();
      onClose();
    } catch (err) {
      console.error('[CSV Import] Error:', err.response?.data || err.message || err);
      const data = err.response?.data;
      const msg = data?.error || data?.message || err.message || 'Import failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const mappedRowCount = Object.values(rowMapping).filter(Boolean).length;
  const mappedMonthCount = Object.values(monthMapping).filter(Boolean).length;

  // Category summary: aggregate mapped accounts by category
  const categorySummary = useMemo(() => {
    const summary = {};
    for (const acct of csvAccounts) {
      const catCode = rowMapping[acct];
      if (!catCode) continue;
      if (!summary[catCode]) {
        const cat = leafCategories.find(c => c.code === catCode);
        summary[catCode] = { name: cat?.display_name || catCode, accounts: 0, monthTotals: {} };
      }
      summary[catCode].accounts++;
      // Sum this account's values into the category
      const csvRow = rows.find(r => r[accountCol] === acct);
      if (csvRow) {
        for (const [csvCol, fiscalMonth] of mappedMonthCols) {
          const rawVal = csvRow[csvCol];
          if (rawVal === undefined || rawVal === '') continue;
          const cleaned = String(rawVal).replace(/[$,]/g, '').trim();
          const val = cleaned === '' ? NaN : parseFloat(cleaned);
          if (isNaN(val)) continue;
          summary[catCode].monthTotals[fiscalMonth] = (summary[catCode].monthTotals[fiscalMonth] || 0) + val;
        }
      }
    }
    return summary;
  }, [csvAccounts, rowMapping, rows, accountCol, mappedMonthCols, leafCategories]);

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
                        {leafCategories.map(c => (
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
        {/* Category summary preview */}
        {Object.keys(categorySummary).length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Category Summary (totals after rollup)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">GL Accounts</TableCell>
                    {mappedMonthCols.map(([col, fm]) => (
                      <TableCell key={col} align="right">{fm}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(categorySummary).map(([code, data]) => (
                    <TableRow key={code}>
                      <TableCell>{data.name}</TableCell>
                      <TableCell align="right">{data.accounts}</TableCell>
                      {mappedMonthCols.map(([, fm]) => (
                        <TableCell key={fm} align="right">
                          {data.monthTotals[fm] != null
                            ? `$${data.monthTotals[fm].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
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
