// Financial category hierarchy definition
// Used for seeding the database and defining row structure in grids

export const CATEGORY_HIERARCHY = [
  { id: 1, code: 'sales_revenue', display_name: 'Sales Revenue', parent_id: null, path: '1', level: 0, sort_order: 1, category_type: 'REVENUE' },

  { id: 2, code: 'inputs', display_name: 'Inputs', parent_id: null, path: '2', level: 0, sort_order: 2, category_type: 'INPUT' },
  { id: 3, code: 'input_seed', display_name: 'Seed', parent_id: 2, path: '2.3', level: 1, sort_order: 3, category_type: 'INPUT' },
  { id: 4, code: 'input_fert', display_name: 'Fertilizer', parent_id: 2, path: '2.4', level: 1, sort_order: 4, category_type: 'INPUT' },
  { id: 5, code: 'input_fert_n', display_name: 'Nitrogen (N)', parent_id: 4, path: '2.4.5', level: 2, sort_order: 5, category_type: 'INPUT' },
  { id: 6, code: 'input_fert_p', display_name: 'Phosphorus (P)', parent_id: 4, path: '2.4.6', level: 2, sort_order: 6, category_type: 'INPUT' },
  { id: 7, code: 'input_fert_k', display_name: 'Potassium (K)', parent_id: 4, path: '2.4.7', level: 2, sort_order: 7, category_type: 'INPUT' },
  { id: 8, code: 'input_fert_s', display_name: 'Sulfur (S)', parent_id: 4, path: '2.4.8', level: 2, sort_order: 8, category_type: 'INPUT' },
  { id: 9, code: 'input_chem', display_name: 'Chemical', parent_id: 2, path: '2.9', level: 1, sort_order: 9, category_type: 'INPUT' },

  { id: 10, code: 'variable_costs', display_name: 'Variable Costs', parent_id: null, path: '10', level: 0, sort_order: 10, category_type: 'VARIABLE' },
  { id: 11, code: 'vc_crop_insurance', display_name: 'Crop/Hail Insurance', parent_id: 10, path: '10.11', level: 1, sort_order: 11, category_type: 'VARIABLE' },
  { id: 12, code: 'vc_fuel', display_name: 'Fuel Oil', parent_id: 10, path: '10.12', level: 1, sort_order: 12, category_type: 'VARIABLE' },
  { id: 13, code: 'vc_repairs', display_name: 'Repairs/Maint/Small Tools', parent_id: 10, path: '10.13', level: 1, sort_order: 13, category_type: 'VARIABLE' },
  { id: 14, code: 'vc_agronomy', display_name: 'Agronomy', parent_id: 10, path: '10.14', level: 1, sort_order: 14, category_type: 'VARIABLE' },
  { id: 15, code: 'vc_marketing', display_name: 'Marketing', parent_id: 10, path: '10.15', level: 1, sort_order: 15, category_type: 'VARIABLE' },
  { id: 16, code: 'vc_meals', display_name: 'Meals/Entertainment', parent_id: 10, path: '10.16', level: 1, sort_order: 16, category_type: 'VARIABLE' },
  { id: 17, code: 'vc_freight', display_name: 'Freight/Trucking', parent_id: 10, path: '10.17', level: 1, sort_order: 17, category_type: 'VARIABLE' },
  { id: 18, code: 'vc_custom_work', display_name: 'Custom Work', parent_id: 10, path: '10.18', level: 1, sort_order: 18, category_type: 'VARIABLE' },
  { id: 19, code: 'vc_variable_labour', display_name: 'Variable Labour', parent_id: 10, path: '10.19', level: 1, sort_order: 19, category_type: 'VARIABLE' },
  { id: 20, code: 'vc_machinery_lease', display_name: 'Machinery Lease (Loans)', parent_id: 10, path: '10.20', level: 1, sort_order: 20, category_type: 'VARIABLE' },

  { id: 21, code: 'fixed_costs', display_name: 'Fixed Costs', parent_id: null, path: '21', level: 0, sort_order: 21, category_type: 'FIXED' },
  { id: 22, code: 'fc_property_tax', display_name: 'Property Taxes', parent_id: 21, path: '21.22', level: 1, sort_order: 22, category_type: 'FIXED' },
  { id: 23, code: 'fc_rent', display_name: 'Rent', parent_id: 21, path: '21.23', level: 1, sort_order: 23, category_type: 'FIXED' },
  { id: 24, code: 'fc_interest_lt_debt', display_name: 'Interest Long-Term Debt', parent_id: 21, path: '21.24', level: 1, sort_order: 24, category_type: 'FIXED' },
  { id: 25, code: 'fc_interest_machinery', display_name: 'Interest Machinery Leases/Loans', parent_id: 21, path: '21.25', level: 1, sort_order: 25, category_type: 'FIXED' },
  { id: 26, code: 'fc_insurance', display_name: 'Insurance', parent_id: 21, path: '21.26', level: 1, sort_order: 26, category_type: 'FIXED' },
  { id: 27, code: 'fc_utilities', display_name: 'Utilities', parent_id: 21, path: '21.27', level: 1, sort_order: 27, category_type: 'FIXED' },
  { id: 28, code: 'fc_professional_fees', display_name: 'Professional Fees/Office', parent_id: 21, path: '21.28', level: 1, sort_order: 28, category_type: 'FIXED' },
  { id: 29, code: 'fc_fixed_labour', display_name: 'Fixed Labour', parent_id: 21, path: '21.29', level: 1, sort_order: 29, category_type: 'FIXED' },
  { id: 30, code: 'fc_building_repairs', display_name: 'Building Repairs/Maint', parent_id: 21, path: '21.30', level: 1, sort_order: 30, category_type: 'FIXED' },
  { id: 31, code: 'fc_building_deprec', display_name: 'Building Depreciation', parent_id: 21, path: '21.31', level: 1, sort_order: 31, category_type: 'FIXED' },
  { id: 32, code: 'fc_machinery_deprec', display_name: 'Machinery Depreciation', parent_id: 21, path: '21.32', level: 1, sort_order: 32, category_type: 'FIXED' },
  { id: 33, code: 'fc_management_fee', display_name: 'Management Fee (Dividend)', parent_id: 21, path: '21.33', level: 1, sort_order: 33, category_type: 'FIXED' },
  { id: 34, code: 'fc_income_tax', display_name: 'Income Tax Paid', parent_id: 21, path: '21.34', level: 1, sort_order: 34, category_type: 'FIXED' },
  { id: 35, code: 'fc_operating_interest', display_name: 'Operating Interest', parent_id: 21, path: '21.35', level: 1, sort_order: 35, category_type: 'FIXED' },
];

// Leaf categories (editable in data_json)
export const LEAF_CATEGORIES = CATEGORY_HIERARCHY.filter(c => {
  const hasChildren = CATEGORY_HIERARCHY.some(other => other.parent_id === c.id);
  return !hasChildren;
});

// Parent categories (computed as sum of children)
export const PARENT_CATEGORIES = CATEGORY_HIERARCHY.filter(c => {
  return CATEGORY_HIERARCHY.some(other => other.parent_id === c.id);
});

// Get children codes for a parent code
export function getChildrenCodes(parentCode) {
  const parent = CATEGORY_HIERARCHY.find(c => c.code === parentCode);
  if (!parent) return [];
  return CATEGORY_HIERARCHY.filter(c => c.parent_id === parent.id).map(c => c.code);
}

// Get all leaf descendants of a parent
export function getLeafDescendants(parentCode) {
  const parent = CATEGORY_HIERARCHY.find(c => c.code === parentCode);
  if (!parent) return [];

  const leaves = [];
  const stack = [parent.id];
  while (stack.length > 0) {
    const currentId = stack.pop();
    const children = CATEGORY_HIERARCHY.filter(c => c.parent_id === currentId);
    if (children.length === 0) {
      const cat = CATEGORY_HIERARCHY.find(c => c.id === currentId);
      if (cat && cat.id !== parent.id) leaves.push(cat.code);
    } else {
      children.forEach(c => stack.push(c.id));
    }
  }
  return leaves;
}
