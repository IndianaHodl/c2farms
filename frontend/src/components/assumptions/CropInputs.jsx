import { Box, TextField, IconButton, Button, Typography, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const formatRevenue = (val) => {
  if (!val || val === 0) return '$0';
  return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export default function CropInputs({ crops, onChange, disabled }) {
  const handleCropChange = (index, field, value) => {
    const updated = [...crops];
    updated[index] = { ...updated[index], [field]: field === 'name' ? value : parseFloat(value) || 0 };
    onChange(updated);
  };

  const addCrop = () => {
    if (crops.length >= 5) return;
    onChange([...crops, { name: '', acres: 0, target_yield: 0, price_per_unit: 0, actual_acres: 0, actual_yield: 0, actual_price: 0 }]);
  };

  const removeCrop = (index) => {
    onChange(crops.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Crops (up to 5)</Typography>
      {crops.map((crop, i) => {
        const targetRevenue = (crop.acres || 0) * (crop.target_yield || 0) * (crop.price_per_unit || 0);
        const actualRevenue = (crop.actual_acres || 0) * (crop.actual_yield || 0) * (crop.actual_price || 0);

        return (
          <Box key={i} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                label="Crop Name"
                value={crop.name}
                onChange={(e) => handleCropChange(i, 'name', e.target.value)}
                disabled={disabled}
                sx={{ flex: 2 }}
              />
              {!disabled && (
                <IconButton onClick={() => removeCrop(i)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Target — Revenue: {formatRevenue(targetRevenue)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Actual — Revenue: {formatRevenue(actualRevenue)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="Actual Acres"
                type="number"
                value={crop.actual_acres || ''}
                onChange={(e) => handleCropChange(i, 'actual_acres', e.target.value)}
                disabled={disabled}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Actual Yield"
                type="number"
                value={crop.actual_yield || ''}
                onChange={(e) => handleCropChange(i, 'actual_yield', e.target.value)}
                disabled={disabled}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Actual Price"
                type="number"
                value={crop.actual_price || ''}
                onChange={(e) => handleCropChange(i, 'actual_price', e.target.value)}
                disabled={disabled}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        );
      })}
      {!disabled && crops.length < 5 && (
        <Button startIcon={<AddIcon />} size="small" onClick={addCrop}>
          Add Crop
        </Button>
      )}
    </Box>
  );
}
