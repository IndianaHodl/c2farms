import { useState } from 'react';
import { Box, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import api from '../../services/api';

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a delay to ensure download starts
  setTimeout(() => window.URL.revokeObjectURL(url), 5000);
}

export default function ExportButtons({ farmId, fiscalYear }) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState('');

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setError('');
    try {
      const res = await api.post(
        `/api/farms/${farmId}/export/pdf/${fiscalYear}`,
        {},
        { responseType: 'blob' }
      );
      downloadBlob(new Blob([res.data]), `operating-statement-${fiscalYear}.pdf`);
    } catch {
      setError('PDF export failed. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    setError('');
    try {
      const res = await api.post(
        `/api/farms/${farmId}/export/excel/${fiscalYear}`,
        {},
        { responseType: 'blob' }
      );
      downloadBlob(new Blob([res.data]), `operating-statement-${fiscalYear}.xlsx`);
    } catch {
      setError('Excel export failed. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={exportingPdf ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
        onClick={handleExportPdf}
        disabled={exportingPdf}
      >
        Export PDF
      </Button>
      <Button
        variant="outlined"
        startIcon={exportingExcel ? <CircularProgress size={16} /> : <TableViewIcon />}
        onClick={handleExportExcel}
        disabled={exportingExcel}
      >
        Export Excel
      </Button>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}
