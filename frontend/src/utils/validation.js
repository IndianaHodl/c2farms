export function validateAssumptions(data) {
  const errors = {};

  if (!data.fiscal_year) errors.fiscal_year = 'Fiscal year is required';
  if (!data.total_acres || data.total_acres <= 0) errors.total_acres = 'Total acres must be positive';

  if (data.crops && Array.isArray(data.crops)) {
    const cropAcresSum = data.crops.reduce((sum, c) => sum + (c.acres || 0), 0);
    if (cropAcresSum > data.total_acres) {
      errors.crops = `Crop acres (${cropAcresSum}) exceed total acres (${data.total_acres})`;
    }

    data.crops.forEach((crop, i) => {
      if (!crop.name) errors[`crop_${i}_name`] = `Crop ${i + 1} name is required`;
      if (!crop.acres || crop.acres <= 0) errors[`crop_${i}_acres`] = `Crop ${i + 1} acres must be positive`;
    });
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
