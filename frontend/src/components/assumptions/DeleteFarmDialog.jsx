import { useState } from 'react';
import { Alert } from '@mui/material';
import ConfirmDialog from '../shared/ConfirmDialog';
import api from '../../services/api';

export default function DeleteFarmDialog({ open, onClose, onSuccess, farm }) {
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setError('');
      await api.delete(`/api/farms/${farm.id}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete farm');
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      title="Delete Farm"
      message={
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {`Are you sure you want to delete "${farm?.name}"? All assumptions, budgets, and financial data for this farm will be permanently removed.`}
        </>
      }
      onConfirm={handleConfirm}
      onCancel={handleClose}
      confirmText="Delete Farm"
      confirmColor="error"
    />
  );
}
