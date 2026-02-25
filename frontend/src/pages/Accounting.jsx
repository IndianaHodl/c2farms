import { useState } from 'react';
import { Typography, Box, Button, Alert, ToggleButtonGroup, ToggleButton } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import ViewListIcon from '@mui/icons-material/ViewList';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AccountingGrid from '../components/accounting/AccountingGrid';
import GlDetailView from '../components/accounting/GlDetailView';
import CashFlowSummary from '../components/accounting/CashFlowSummary';
import ExportButtons from '../components/accounting/ExportButtons';
import CsvImportButton from '../components/accounting/CsvImportButton';
import { useFarm } from '../contexts/FarmContext';
import api from '../services/api';

export default function Accounting() {
  const { currentFarm, fiscalYear } = useFarm();
  const [summary, setSummary] = useState({});
  const [months, setMonths] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState('executive');

  const handleSummaryLoaded = (newSummary, newMonths) => {
    setSummary(newSummary);
    if (newMonths) setMonths(newMonths);
  };

  const handleQBSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await api.post(`/api/farms/${currentFarm.id}/quickbooks/sync`, {
        fiscal_year: fiscalYear,
      });
      if (res.data.fallback) {
        setSyncMessage(res.data.message);
      } else {
        setSyncMessage('QuickBooks sync completed successfully');
        setRefreshKey(k => k + 1);
      }
    } catch {
      setSyncMessage('QuickBooks sync failed. Please enter actuals manually.');
    } finally {
      setSyncing(false);
    }
  };

  if (!currentFarm) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No farm selected.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">
            Section 3: Accounting Operating Statement
          </Typography>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, v) => { if (v) setView(v); }}
            size="small"
          >
            <ToggleButton value="executive">
              <SummarizeIcon sx={{ mr: 0.5, fontSize: 18 }} /> Executive
            </ToggleButton>
            <ToggleButton value="detail">
              <ViewListIcon sx={{ mr: 0.5, fontSize: 18 }} /> Detail
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <CsvImportButton
            farmId={currentFarm.id}
            fiscalYear={fiscalYear}
            onImportComplete={() => setRefreshKey(k => k + 1)}
          />
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleQBSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'QB Sync'}
          </Button>
          <ExportButtons farmId={currentFarm.id} fiscalYear={fiscalYear} />
        </Box>
      </Box>

      {syncMessage && (
        <Alert
          severity={syncMessage.includes('failed') || syncMessage.includes('not connected') ? 'warning' : 'info'}
          sx={{ mb: 2 }}
          onClose={() => setSyncMessage('')}
        >
          {syncMessage}
        </Alert>
      )}

      {view === 'executive' ? (
        <>
          <AccountingGrid
            farmId={currentFarm.id}
            fiscalYear={fiscalYear}
            key={refreshKey}
            onSummaryLoaded={handleSummaryLoaded}
          />
          <CashFlowSummary summary={summary} months={months} />
        </>
      ) : (
        <GlDetailView
          farmId={currentFarm.id}
          fiscalYear={fiscalYear}
          months={months}
          key={`detail-${refreshKey}`}
        />
      )}
    </Box>
  );
}
