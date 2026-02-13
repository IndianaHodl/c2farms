import { Box, TextField, IconButton, Button, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function CropInputs({ crops, onChange, disabled }) {
  const handleCropChange = (index, field, value) => {
    const updated = [...crops];
    updated[index] = { ...updated[index], [field]: field === 'name' ? value : parseFloat(value) || 0 };
    onChange(updated);
  };

  const addCrop = () => {
    if (crops.length >= 5) return;
    onChange([...crops, { name: '', acres: 0, target_yield: 0, price_per_unit: 0 }]);
  };

  const removeCrop = (index) => {
    onChange(crops.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Crops (up to 5)</Typography>
      {crops.map((crop, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Crop Name"
            value={crop.name}
            onChange={(e) => handleCropChange(i, 'name', e.target.value)}
            disabled={disabled}
            sx={{ flex: 2 }}
          />
          <TextField
            size="small"
            label="Acres"
            type="number"
            value={crop.acres || ''}
            onChange={(e) => handleCropChange(i, 'acres', e.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Target Yield"
            type="number"
            value={crop.target_yield || ''}
            onChange={(e) => handleCropChange(i, 'target_yield', e.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            label="Price/Unit"
            type="number"
            value={crop.price_per_unit || ''}
            onChange={(e) => handleCropChange(i, 'price_per_unit', e.target.value)}
            disabled={disabled}
            sx={{ flex: 1 }}
          />
          {!disabled && (
            <IconButton onClick={() => removeCrop(i)} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      ))}
      {!disabled && crops.length < 5 && (
        <Button startIcon={<AddIcon />} size="small" onClick={addCrop}>
          Add Crop
        </Button>
      )}
    </Box>
  );
}
