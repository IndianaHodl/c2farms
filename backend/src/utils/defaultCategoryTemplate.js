// Default category hierarchy template for new farms
// Matches the Monthly Operations layout: Revenue, Inputs, LPM, LBF, Insurance

// Template categories - parent_id references are resolved at init time using 'ref' field
export const DEFAULT_CATEGORIES = [
  // REVENUE
  { code: 'revenue', display_name: 'Revenue', ref: null, level: 0, sort_order: 1, category_type: 'REVENUE' },
  { code: 'rev_other_income', display_name: 'Other Income', ref: 'revenue', level: 1, sort_order: 2, category_type: 'REVENUE' },
  // Crop-specific revenue children are generated dynamically from assumptions

  // INPUTS
  { code: 'inputs', display_name: 'Inputs', ref: null, level: 0, sort_order: 100, category_type: 'INPUT' },
  { code: 'input_seed', display_name: 'Seed', ref: 'inputs', level: 1, sort_order: 101, category_type: 'INPUT' },
  { code: 'input_fert', display_name: 'Fertilizer', ref: 'inputs', level: 1, sort_order: 102, category_type: 'INPUT' },
  { code: 'input_chem', display_name: 'Chemical', ref: 'inputs', level: 1, sort_order: 103, category_type: 'INPUT' },

  // LPM - Labour Power Machinery
  { code: 'lpm', display_name: 'LPM - Labour Power Machinery', ref: null, level: 0, sort_order: 200, category_type: 'LPM' },
  { code: 'lpm_personnel', display_name: 'Personnel', ref: 'lpm', level: 1, sort_order: 201, category_type: 'LPM' },
  { code: 'lpm_fog', display_name: 'Fuel Oil Grease', ref: 'lpm', level: 1, sort_order: 202, category_type: 'LPM' },
  { code: 'lpm_repairs', display_name: 'Repairs', ref: 'lpm', level: 1, sort_order: 203, category_type: 'LPM' },
  { code: 'lpm_shop', display_name: 'Shop', ref: 'lpm', level: 1, sort_order: 204, category_type: 'LPM' },

  // LBF - Land Building Finance
  { code: 'lbf', display_name: 'LBF - Land Building Finance', ref: null, level: 0, sort_order: 300, category_type: 'LBF' },
  { code: 'lbf_rent_interest', display_name: 'Rent & Interest', ref: 'lbf', level: 1, sort_order: 301, category_type: 'LBF' },

  // INSURANCE
  { code: 'insurance', display_name: 'Insurance', ref: null, level: 0, sort_order: 400, category_type: 'INSURANCE' },
  { code: 'ins_crop', display_name: 'Crop Insurance', ref: 'insurance', level: 1, sort_order: 401, category_type: 'INSURANCE' },
  { code: 'ins_other', display_name: 'Other Insurance', ref: 'insurance', level: 1, sort_order: 402, category_type: 'INSURANCE' },
];

// Generate crop revenue categories from assumption crops
export function generateCropRevenueCategories(crops) {
  if (!crops || crops.length === 0) return [];
  return crops.map((crop, idx) => ({
    code: `rev_${crop.name.toLowerCase().replace(/\s+/g, '_')}`,
    display_name: `${crop.name} Revenue`,
    ref: 'revenue',
    level: 1,
    sort_order: 10 + idx,
    category_type: 'REVENUE',
  }));
}

// Default GL account mappings (from QBO data)
// Each entry: { account_number, account_name, category_code }
export const DEFAULT_GL_ACCOUNTS = [
  // Revenue
  { account_number: '4010', account_name: 'Canola Sales', category_code: 'rev_canola' },
  { account_number: '4020', account_name: 'Durum Sales', category_code: 'rev_durum' },
  { account_number: '4030', account_name: 'Chickpeas Sales', category_code: 'rev_chickpeas' },
  { account_number: '4040', account_name: 'Lentils Sales', category_code: 'rev_small_red_lentils' },
  { account_number: '4099', account_name: 'Other Farm Income', category_code: 'rev_other_income' },
  { account_number: '4100', account_name: 'Surface Lease Income', category_code: 'rev_other_income' },
  { account_number: '4110', account_name: 'Custom Work Income', category_code: 'rev_other_income' },
  { account_number: '4120', account_name: 'Rebates', category_code: 'rev_other_income' },

  // Inputs - Seed
  { account_number: '9660', account_name: 'Seed', category_code: 'input_seed' },
  { account_number: '9660.1', account_name: 'Seed Treatment', category_code: 'input_seed' },

  // Inputs - Fertilizer
  { account_number: '9662', account_name: 'Fertilizers and Lime', category_code: 'input_fert' },
  { account_number: '9662.1', account_name: 'Fertilizer Application', category_code: 'input_fert' },
  { account_number: '9662.2', account_name: 'Micronutrients', category_code: 'input_fert' },

  // Inputs - Chemical
  { account_number: '9664', account_name: 'Herbicides', category_code: 'input_chem' },
  { account_number: '9664.1', account_name: 'Fungicides', category_code: 'input_chem' },
  { account_number: '9664.2', account_name: 'Insecticides', category_code: 'input_chem' },
  { account_number: '9664.3', account_name: 'Adjuvants & Surfactants', category_code: 'input_chem' },

  // LPM - Personnel
  { account_number: '9670', account_name: 'Wages & Salaries', category_code: 'lpm_personnel' },
  { account_number: '9670.1', account_name: 'Benefits & WCB', category_code: 'lpm_personnel' },
  { account_number: '9670.2', account_name: 'Contract Labour', category_code: 'lpm_personnel' },

  // LPM - Fuel Oil Grease
  { account_number: '9672', account_name: 'Fuel', category_code: 'lpm_fog' },
  { account_number: '9672.1', account_name: 'Oil & Lubricants', category_code: 'lpm_fog' },
  { account_number: '9672.2', account_name: 'Grease', category_code: 'lpm_fog' },

  // LPM - Repairs
  { account_number: '9674', account_name: 'Equipment Repairs', category_code: 'lpm_repairs' },
  { account_number: '9674.1', account_name: 'Parts & Small Tools', category_code: 'lpm_repairs' },
  { account_number: '9674.2', account_name: 'Tire Repairs', category_code: 'lpm_repairs' },

  // LPM - Shop
  { account_number: '9676', account_name: 'Shop Supplies', category_code: 'lpm_shop' },
  { account_number: '9676.1', account_name: 'Meals & Entertainment', category_code: 'lpm_shop' },
  { account_number: '9676.2', account_name: 'Freight & Trucking', category_code: 'lpm_shop' },
  { account_number: '9676.3', account_name: 'Custom Work Expense', category_code: 'lpm_shop' },
  { account_number: '9676.4', account_name: 'Utilities', category_code: 'lpm_shop' },
  { account_number: '9676.5', account_name: 'Professional Fees', category_code: 'lpm_shop' },
  { account_number: '9676.6', account_name: 'Office Expense', category_code: 'lpm_shop' },
  { account_number: '9676.7', account_name: 'Marketing', category_code: 'lpm_shop' },
  { account_number: '9676.8', account_name: 'Agronomy', category_code: 'lpm_shop' },
  { account_number: '9676.9', account_name: 'Machinery Lease Payments', category_code: 'lpm_shop' },
  { account_number: '9676.10', account_name: 'Depreciation - Machinery', category_code: 'lpm_shop' },
  { account_number: '9676.11', account_name: 'Depreciation - Buildings', category_code: 'lpm_shop' },

  // LBF - Rent & Interest
  { account_number: '9680', account_name: 'Land Rent', category_code: 'lbf_rent_interest' },
  { account_number: '9680.1', account_name: 'Property Taxes', category_code: 'lbf_rent_interest' },
  { account_number: '9682', account_name: 'Interest - Long Term Debt', category_code: 'lbf_rent_interest' },
  { account_number: '9682.1', account_name: 'Interest - Machinery Loans', category_code: 'lbf_rent_interest' },
  { account_number: '9682.2', account_name: 'Interest - Operating Line', category_code: 'lbf_rent_interest' },
  { account_number: '9684', account_name: 'Building Repairs', category_code: 'lbf_rent_interest' },

  // Insurance
  { account_number: '9690', account_name: 'Crop Insurance Premiums', category_code: 'ins_crop' },
  { account_number: '9690.1', account_name: 'Hail Insurance', category_code: 'ins_crop' },
  { account_number: '9692', account_name: 'Farm Insurance', category_code: 'ins_other' },
  { account_number: '9692.1', account_name: 'Liability Insurance', category_code: 'ins_other' },

  // Other
  { account_number: '9700', account_name: 'Management Fee / Dividend', category_code: 'lbf_rent_interest' },
  { account_number: '9710', account_name: 'Income Tax Paid', category_code: 'lbf_rent_interest' },
];

// Mapping from old category codes to new category codes
export const OLD_TO_NEW_CODE_MAP = {
  'sales_revenue': 'revenue',
  'input_seed': 'input_seed',
  'input_fert': 'input_fert',
  'input_fert_n': 'input_fert',
  'input_fert_p': 'input_fert',
  'input_fert_k': 'input_fert',
  'input_fert_s': 'input_fert',
  'input_chem': 'input_chem',
  'inputs': 'inputs',
  'vc_crop_insurance': 'ins_crop',
  'vc_fuel': 'lpm_fog',
  'vc_repairs': 'lpm_repairs',
  'vc_agronomy': 'lpm_shop',
  'vc_marketing': 'lpm_shop',
  'vc_meals': 'lpm_shop',
  'vc_freight': 'lpm_shop',
  'vc_custom_work': 'lpm_shop',
  'vc_variable_labour': 'lpm_personnel',
  'vc_machinery_lease': 'lpm_shop',
  'variable_costs': null, // decomposed
  'fc_property_tax': 'lbf_rent_interest',
  'fc_rent': 'lbf_rent_interest',
  'fc_interest_lt_debt': 'lbf_rent_interest',
  'fc_interest_machinery': 'lbf_rent_interest',
  'fc_insurance': 'ins_other',
  'fc_utilities': 'lpm_shop',
  'fc_professional_fees': 'lpm_shop',
  'fc_fixed_labour': 'lpm_personnel',
  'fc_building_repairs': 'lbf_rent_interest',
  'fc_building_deprec': 'lpm_shop',
  'fc_machinery_deprec': 'lpm_shop',
  'fc_management_fee': 'lbf_rent_interest',
  'fc_income_tax': 'lbf_rent_interest',
  'fc_operating_interest': 'lbf_rent_interest',
  'fixed_costs': null, // decomposed
};
