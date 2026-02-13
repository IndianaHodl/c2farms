import { Box, TextField, IconButton, Button, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function BinInputs({ bins, onChange, disabled }) {
  const handleBinChange = (index, field, value) => {
    const updated = [...bins];
    updated[index] = { ...updated[index], [field]: field === 'name' || field === 'grain_type' ? value : parseFloat(value) || 0 };
    onChange(updated);
  };

  const addBin = () => {
    onChange([...bins, { name: '', capacity: 0, opening_balance: 0, grain_type: '' }]);
  };

  const removeBin = (index) => {
    onChange(bins.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Bins</Typography>
      {bins.map((bin, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Bin Name"
            value={bin.name}
            onChange={(e) => handleBinChange(i, 'name', e.target.value)}
            disabled={disabled}
            sx={{ flex: 2 }}
          />
          <TextField
            size="small"
            label="Capacity (bu)"
            type="number"
            value={bin.capacity || ''}
            onChange={(e) => handleBinChange(i, 'capacity', e.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Opening Bal"
            type="number"
            value={bin.opening_balance || ''}
            onChange={(e) => handleBinChange(i, 'opening_balance', e.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Grain Type"
            value={bin.grain_type}
            onChange={(e) => handleBinChange(i, 'grain_type', e.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          {!disabled && (
            <IconButton onClick={() => removeBin(i)} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      ))}
      {!disabled && (
        <Button startIcon={<AddIcon />} size="small" onClick={addBin}>
          Add Bin
        </Button>
      )}
    </Box>
  );
}
