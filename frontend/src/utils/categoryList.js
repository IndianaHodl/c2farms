// This file is maintained for backward compatibility with CsvImportDialog.
// The canonical source of categories is now the backend API: GET /api/farms/:farmId/categories

import api from '../services/api';

// Fetch leaf categories from the API for a specific farm
export async function fetchFarmCategories(farmId) {
  const res = await api.get(`/api/farms/${farmId}/categories`);
  const categories = res.data.categories || [];
  // Determine which are leaf (no children)
  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  return categories.filter(c => !parentIds.has(c.id));
}

// Fetch full category hierarchy from the API
export async function fetchFullCategories(farmId) {
  const res = await api.get(`/api/farms/${farmId}/categories`);
  return res.data.categories || [];
}

// Static fallback for backward compatibility
export const LEAF_CATEGORIES = [
  { code: 'input_seed', display_name: 'Seed' },
  { code: 'input_fert', display_name: 'Fertilizer' },
  { code: 'input_chem', display_name: 'Chemical' },
  { code: 'lpm_personnel', display_name: 'Personnel' },
  { code: 'lpm_fog', display_name: 'Fuel Oil Grease' },
  { code: 'lpm_repairs', display_name: 'Repairs' },
  { code: 'lpm_shop', display_name: 'Shop' },
  { code: 'lbf_rent_interest', display_name: 'Rent & Interest' },
  { code: 'ins_crop', display_name: 'Crop Insurance' },
  { code: 'ins_other', display_name: 'Other Insurance' },
  { code: 'rev_other_income', display_name: 'Other Income' },
];
