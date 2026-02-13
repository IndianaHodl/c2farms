import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import api from '../../services/api';

export default function AddFarmDialog({ open, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Farm name is required');
      return;
    }
    try {
      await api.post('/api/farms', { name: name.trim() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create farm');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New Farm</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Farm Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Create Farm</Button>
      </DialogActions>
    </Dialog>
  );
}
