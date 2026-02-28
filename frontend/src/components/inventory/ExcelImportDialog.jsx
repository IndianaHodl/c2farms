import { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
  LinearProgress, Alert, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from '../../services/api';

export default function ExcelImportDialog({ open, onClose, onComplete, farmId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file || !farmId) return;
    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(`/api/farms/${farmId}/inventory/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed. Please check the file format.');
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    setFile(null);
    setResult(null);
    setError('');
    onComplete();
  };

  const handleClose = () => {
    if (uploading) return;
    setFile(null);
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Inventory from Excel</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload an Excel file with monthly inventory sheets. Sheets named like "Oct 31, 25" or "Nov 30, 25" will be detected automatically.
        </Typography>

        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleFileChange}
          />
          <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography>
            {file ? file.name : 'Click to select an Excel file'}
          </Typography>
          {file && (
            <Typography variant="caption" color="text.secondary">
              {(file.size / 1024).toFixed(0)} KB
            </Typography>
          )}
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Importing... This may take a minute for large files.
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {result && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 1 }}>
              Import complete: {result.locations} locations, {result.bins} bins, {result.snapshots} snapshots
            </Alert>
            <List dense>
              {result.sheets?.map(s => (
                <ListItem key={s.name}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {s.snapshots > 0 ? <CheckCircleIcon color="success" fontSize="small" /> : <ErrorIcon color="warning" fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={s.name}
                    secondary={`${s.snapshots} rows imported (${s.date})`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button onClick={handleDone} variant="contained">Done</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} variant="contained" disabled={!file || uploading}>
              {uploading ? 'Importing...' : 'Import'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
