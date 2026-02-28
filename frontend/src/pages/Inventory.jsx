import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Box, Tab, Tabs, FormControl, InputLabel, Select, MenuItem, Button, Alert, CircularProgress,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useFarm } from '../contexts/FarmContext';
import api from '../services/api';
import InventoryGrid from '../components/inventory/InventoryGrid';
import InventorySummary from '../components/inventory/InventorySummary';
import InventoryComparison from '../components/inventory/InventoryComparison';
import ExcelImportDialog from '../components/inventory/ExcelImportDialog';

export default function Inventory() {
  const { currentFarm, canEdit } = useFarm();
  const [tab, setTab] = useState(0);
  const [snapshotDates, setSnapshotDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const fetchDates = useCallback(async () => {
    if (!currentFarm?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/farms/${currentFarm.id}/inventory/snapshot-dates`);
      const dates = res.data || [];
      setSnapshotDates(dates);
      setSelectedDate(prev => (dates.length > 0 && !prev) ? dates[0] : prev);
      setError('');
    } catch {
      setError('Failed to load snapshot dates');
    } finally {
      setLoading(false);
    }
  }, [currentFarm?.id]);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  const handleImportComplete = () => {
    setImportOpen(false);
    setSelectedDate(''); // reset so it picks latest
    fetchDates();
  };

  if (!currentFarm) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No farm selected.</Typography>
      </Box>
    );
  }

  const dateLabel = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Section 6: Inventory</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {snapshotDates.length > 0 && tab !== 2 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Snapshot Date</InputLabel>
              <Select
                value={selectedDate}
                label="Snapshot Date"
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                {snapshotDates.map(d => (
                  <MenuItem key={d} value={d}>{dateLabel(d)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {canEdit && (
            <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : snapshotDates.length === 0 ? (
        <Alert severity="info">
          No inventory data yet. {canEdit ? 'Import an Excel spreadsheet to get started.' : 'Ask a manager to import data.'}
        </Alert>
      ) : (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Bin Detail" />
            <Tab label="Summary" />
            <Tab label="Comparison" />
          </Tabs>

          {tab === 0 && <InventoryGrid farmId={currentFarm.id} date={selectedDate} canEdit={canEdit} />}
          {tab === 1 && <InventorySummary farmId={currentFarm.id} date={selectedDate} />}
          {tab === 2 && <InventoryComparison farmId={currentFarm.id} snapshotDates={snapshotDates} />}
        </>
      )}

      <ExcelImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={handleImportComplete}
        farmId={currentFarm.id}
      />
    </Box>
  );
}
