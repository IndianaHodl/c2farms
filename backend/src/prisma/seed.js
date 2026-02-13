import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CATEGORY_HIERARCHY, LEAF_CATEGORIES } from '../utils/categories.js';
import { FISCAL_MONTHS } from '../utils/fiscalYear.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed financial categories
  for (const cat of CATEGORY_HIERARCHY) {
    await prisma.financialCategory.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }
  console.log(`Seeded ${CATEGORY_HIERARCHY.length} financial categories`);

  // Create sample user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'farmer@c2farms.com' },
    update: {},
    create: {
      email: 'farmer@c2farms.com',
      password_hash: passwordHash,
      name: 'John Prairie',
      role: 'farm_manager',
    },
  });
  console.log(`User: ${user.email}`);

  // Create sample farm
  let farm = await prisma.farm.findFirst({ where: { name: 'Prairie Fields Farm' } });
  if (!farm) {
    farm = await prisma.farm.create({
      data: { name: 'Prairie Fields Farm' },
    });
  }
  console.log(`Farm: ${farm.name} (${farm.id})`);

  // Link user to farm
  await prisma.userFarmRole.upsert({
    where: { user_id_farm_id: { user_id: user.id, farm_id: farm.id } },
    update: {},
    create: { user_id: user.id, farm_id: farm.id, role: 'admin' },
  });

  const FISCAL_YEAR = 2026;
  const crops = [
    { name: 'Wheat', acres: 2000, target_yield: 50, price_per_unit: 7 },
    { name: 'Canola', acres: 1500, target_yield: 45, price_per_unit: 14 },
    { name: 'Barley', acres: 1500, target_yield: 75, price_per_unit: 5 },
  ];
  const bins = [
    { name: 'Bin A - Main', capacity: 50000, opening_balance: 12000, grain_type: 'Wheat' },
    { name: 'Bin B - East', capacity: 35000, opening_balance: 8000, grain_type: 'Canola' },
    { name: 'Bin C - West', capacity: 40000, opening_balance: 15000, grain_type: 'Barley' },
  ];

  // Create assumptions
  await prisma.assumption.upsert({
    where: { farm_id_fiscal_year: { farm_id: farm.id, fiscal_year: FISCAL_YEAR } },
    update: { total_acres: 5000, crops_json: crops, bins_json: bins },
    create: {
      farm_id: farm.id,
      fiscal_year: FISCAL_YEAR,
      total_acres: 5000,
      crops_json: crops,
      bins_json: bins,
    },
  });

  // Monthly per-unit budget data ($/acre/month)
  const monthlyBudgets = {
    Nov: { sales_revenue: 0, input_seed: 0, input_fert_n: 0, input_fert_p: 0, input_fert_k: 0, input_fert_s: 0, input_chem: 0, vc_crop_insurance: 2.5, vc_fuel: 3, vc_repairs: 2, vc_agronomy: 0.5, vc_marketing: 0.3, vc_meals: 0.2, vc_freight: 0.5, vc_custom_work: 0, vc_variable_labour: 3, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.6, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Dec: { sales_revenue: 0, input_seed: 0, input_fert_n: 0, input_fert_p: 0, input_fert_k: 0, input_fert_s: 0, input_chem: 0, vc_crop_insurance: 2.5, vc_fuel: 1.5, vc_repairs: 1.5, vc_agronomy: 0.5, vc_marketing: 0.3, vc_meals: 0.3, vc_freight: 0.2, vc_custom_work: 0, vc_variable_labour: 2, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.8, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.2, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Jan: { sales_revenue: 15, input_seed: 0, input_fert_n: 0, input_fert_p: 0, input_fert_k: 0, input_fert_s: 0, input_chem: 0, vc_crop_insurance: 2.5, vc_fuel: 1, vc_repairs: 1, vc_agronomy: 1, vc_marketing: 0.5, vc_meals: 0.2, vc_freight: 0.5, vc_custom_work: 0, vc_variable_labour: 2, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.9, fc_professional_fees: 1.5, fc_fixed_labour: 5, fc_building_repairs: 0.2, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Feb: { sales_revenue: 20, input_seed: 0, input_fert_n: 5, input_fert_p: 3, input_fert_k: 2, input_fert_s: 1, input_chem: 0, vc_crop_insurance: 2.5, vc_fuel: 2, vc_repairs: 1.5, vc_agronomy: 1.5, vc_marketing: 0.5, vc_meals: 0.2, vc_freight: 1, vc_custom_work: 0, vc_variable_labour: 3, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.7, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Mar: { sales_revenue: 10, input_seed: 8, input_fert_n: 10, input_fert_p: 5, input_fert_k: 3, input_fert_s: 1.5, input_chem: 4, vc_crop_insurance: 2.5, vc_fuel: 5, vc_repairs: 3, vc_agronomy: 2, vc_marketing: 0.5, vc_meals: 0.3, vc_freight: 2, vc_custom_work: 1, vc_variable_labour: 5, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.6, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.5, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Apr: { sales_revenue: 5, input_seed: 12, input_fert_n: 12, input_fert_p: 6, input_fert_k: 4, input_fert_s: 2, input_chem: 8, vc_crop_insurance: 2.5, vc_fuel: 8, vc_repairs: 4, vc_agronomy: 2, vc_marketing: 0.5, vc_meals: 0.3, vc_freight: 2, vc_custom_work: 3, vc_variable_labour: 6, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.5, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    May: { sales_revenue: 5, input_seed: 5, input_fert_n: 8, input_fert_p: 4, input_fert_k: 2, input_fert_s: 1, input_chem: 10, vc_crop_insurance: 2.5, vc_fuel: 7, vc_repairs: 3.5, vc_agronomy: 2, vc_marketing: 0.5, vc_meals: 0.3, vc_freight: 1.5, vc_custom_work: 2, vc_variable_labour: 5, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Jun: { sales_revenue: 5, input_seed: 0, input_fert_n: 5, input_fert_p: 2, input_fert_k: 1, input_fert_s: 0.5, input_chem: 6, vc_crop_insurance: 2.5, vc_fuel: 6, vc_repairs: 3, vc_agronomy: 1.5, vc_marketing: 0.5, vc_meals: 0.3, vc_freight: 1, vc_custom_work: 1, vc_variable_labour: 4, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Jul: { sales_revenue: 10, input_seed: 0, input_fert_n: 2, input_fert_p: 1, input_fert_k: 0.5, input_fert_s: 0, input_chem: 4, vc_crop_insurance: 2.5, vc_fuel: 5, vc_repairs: 2.5, vc_agronomy: 1, vc_marketing: 0.5, vc_meals: 0.3, vc_freight: 1, vc_custom_work: 0.5, vc_variable_labour: 4, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Aug: { sales_revenue: 60, input_seed: 0, input_fert_n: 0, input_fert_p: 0, input_fert_k: 0, input_fert_s: 0, input_chem: 2, vc_crop_insurance: 2.5, vc_fuel: 10, vc_repairs: 5, vc_agronomy: 0.5, vc_marketing: 2, vc_meals: 0.5, vc_freight: 4, vc_custom_work: 3, vc_variable_labour: 8, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.5, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 0, fc_operating_interest: 0.5 },
    Sep: { sales_revenue: 80, input_seed: 0, input_fert_n: 0, input_fert_p: 0, input_fert_k: 0, input_fert_s: 0, input_chem: 0, vc_crop_insurance: 2.5, vc_fuel: 8, vc_repairs: 4, vc_agronomy: 0.5, vc_marketing: 3, vc_meals: 0.4, vc_freight: 5, vc_custom_work: 2, vc_variable_labour: 7, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 5, fc_operating_interest: 0.5 },
    Oct: { sales_revenue: 50, input_seed: 0, input_fert_n: 0, input_fert_p: 0, input_fert_k: 0, input_fert_s: 0, input_chem: 0, vc_crop_insurance: 2.5, vc_fuel: 4, vc_repairs: 3, vc_agronomy: 0.5, vc_marketing: 2, vc_meals: 0.3, vc_freight: 3, vc_custom_work: 1, vc_variable_labour: 4, vc_machinery_lease: 4.5, fc_property_tax: 1.5, fc_rent: 8, fc_interest_lt_debt: 2, fc_interest_machinery: 1.5, fc_insurance: 1.2, fc_utilities: 0.5, fc_professional_fees: 0.4, fc_fixed_labour: 5, fc_building_repairs: 0.3, fc_building_deprec: 0.8, fc_machinery_deprec: 3.5, fc_management_fee: 2, fc_income_tax: 10, fc_operating_interest: 0.5 },
  };

  // Helper: recalc parent sums
  function recalcParents(data) {
    const result = { ...data };
    // Fertilizer = N + P + K + S
    result.input_fert = (result.input_fert_n || 0) + (result.input_fert_p || 0) + (result.input_fert_k || 0) + (result.input_fert_s || 0);
    // Inputs = seed + fert + chem
    result.inputs = (result.input_seed || 0) + (result.input_fert || 0) + (result.input_chem || 0);
    // Variable costs
    result.variable_costs = (result.vc_crop_insurance || 0) + (result.vc_fuel || 0) + (result.vc_repairs || 0) + (result.vc_agronomy || 0) + (result.vc_marketing || 0) + (result.vc_meals || 0) + (result.vc_freight || 0) + (result.vc_custom_work || 0) + (result.vc_variable_labour || 0) + (result.vc_machinery_lease || 0);
    // Fixed costs
    result.fixed_costs = (result.fc_property_tax || 0) + (result.fc_rent || 0) + (result.fc_interest_lt_debt || 0) + (result.fc_interest_machinery || 0) + (result.fc_insurance || 0) + (result.fc_utilities || 0) + (result.fc_professional_fees || 0) + (result.fc_fixed_labour || 0) + (result.fc_building_repairs || 0) + (result.fc_building_deprec || 0) + (result.fc_machinery_deprec || 0) + (result.fc_management_fee || 0) + (result.fc_income_tax || 0) + (result.fc_operating_interest || 0);
    return result;
  }

  const TOTAL_ACRES = 5000;
  // Months that have "actuals" (Nov 2025 through Jan 2026 for FY2026)
  const actualMonths = ['Nov', 'Dec', 'Jan', 'Feb'];

  for (const month of FISCAL_MONTHS) {
    const rawData = monthlyBudgets[month];
    const perUnitData = recalcParents(rawData);
    const isActual = actualMonths.includes(month);

    // Slightly adjust actuals to differ from budget
    const adjustedPerUnit = { ...perUnitData };
    if (isActual) {
      for (const key of Object.keys(adjustedPerUnit)) {
        // Add +-5% random variation for actuals
        adjustedPerUnit[key] = adjustedPerUnit[key] * (0.95 + Math.random() * 0.1);
      }
      // Recalc parents after adjustment
      Object.assign(adjustedPerUnit, recalcParents(adjustedPerUnit));
    }

    const finalPerUnit = isActual ? adjustedPerUnit : perUnitData;

    // Per-unit data
    await prisma.monthlyData.upsert({
      where: {
        farm_id_fiscal_year_month_type: {
          farm_id: farm.id, fiscal_year: FISCAL_YEAR, month, type: 'per_unit',
        },
      },
      update: { data_json: finalPerUnit, is_actual: isActual },
      create: {
        farm_id: farm.id, fiscal_year: FISCAL_YEAR, month, type: 'per_unit',
        data_json: finalPerUnit, is_actual: isActual, comments_json: {},
      },
    });

    // Accounting data (per-unit * total_acres)
    const accountingData = {};
    for (const [key, val] of Object.entries(finalPerUnit)) {
      accountingData[key] = val * TOTAL_ACRES;
    }

    await prisma.monthlyData.upsert({
      where: {
        farm_id_fiscal_year_month_type: {
          farm_id: farm.id, fiscal_year: FISCAL_YEAR, month, type: 'accounting',
        },
      },
      update: { data_json: accountingData, is_actual: isActual },
      create: {
        farm_id: farm.id, fiscal_year: FISCAL_YEAR, month, type: 'accounting',
        data_json: accountingData, is_actual: isActual, comments_json: {},
      },
    });
  }
  console.log('Seeded monthly data for FY2026');

  // Create frozen budget (copy of original budget without adjustments)
  await prisma.monthlyDataFrozen.deleteMany({
    where: { farm_id: farm.id, fiscal_year: FISCAL_YEAR },
  });

  for (const month of FISCAL_MONTHS) {
    const rawData = monthlyBudgets[month];
    const perUnitData = recalcParents(rawData);
    const accountingData = {};
    for (const [key, val] of Object.entries(perUnitData)) {
      accountingData[key] = val * TOTAL_ACRES;
    }

    await prisma.monthlyDataFrozen.create({
      data: {
        farm_id: farm.id, fiscal_year: FISCAL_YEAR, month, type: 'per_unit',
        data_json: perUnitData, comments_json: {},
      },
    });
    await prisma.monthlyDataFrozen.create({
      data: {
        farm_id: farm.id, fiscal_year: FISCAL_YEAR, month, type: 'accounting',
        data_json: accountingData, comments_json: {},
      },
    });
  }

  // Mark assumptions as frozen
  await prisma.assumption.update({
    where: { farm_id_fiscal_year: { farm_id: farm.id, fiscal_year: FISCAL_YEAR } },
    data: { is_frozen: true, frozen_at: new Date() },
  });
  console.log('Created frozen budget snapshot');

  // Prior year data (FY2025) - aggregated mock
  const PRIOR_YEAR = 2025;
  await prisma.assumption.upsert({
    where: { farm_id_fiscal_year: { farm_id: farm.id, fiscal_year: PRIOR_YEAR } },
    update: {},
    create: {
      farm_id: farm.id,
      fiscal_year: PRIOR_YEAR,
      total_acres: 4800,
      crops_json: [
        { name: 'Wheat', acres: 1800, target_yield: 48, price_per_unit: 6.5 },
        { name: 'Canola', acres: 1500, target_yield: 42, price_per_unit: 13 },
        { name: 'Barley', acres: 1500, target_yield: 70, price_per_unit: 4.8 },
      ],
      bins_json: bins,
      is_frozen: true,
      frozen_at: new Date('2024-11-01'),
    },
  });

  for (const month of FISCAL_MONTHS) {
    const rawData = monthlyBudgets[month];
    const perUnitData = recalcParents(rawData);
    // Prior year slightly lower
    const adjustedData = {};
    for (const [key, val] of Object.entries(perUnitData)) {
      adjustedData[key] = val * 0.92;
    }
    Object.assign(adjustedData, recalcParents(adjustedData));

    const accountingData = {};
    for (const [key, val] of Object.entries(adjustedData)) {
      accountingData[key] = val * 4800;
    }

    await prisma.monthlyData.upsert({
      where: {
        farm_id_fiscal_year_month_type: { farm_id: farm.id, fiscal_year: PRIOR_YEAR, month, type: 'per_unit' },
      },
      update: { data_json: adjustedData, is_actual: true },
      create: {
        farm_id: farm.id, fiscal_year: PRIOR_YEAR, month, type: 'per_unit',
        data_json: adjustedData, is_actual: true, comments_json: {},
      },
    });

    await prisma.monthlyData.upsert({
      where: {
        farm_id_fiscal_year_month_type: { farm_id: farm.id, fiscal_year: PRIOR_YEAR, month, type: 'accounting' },
      },
      update: { data_json: accountingData, is_actual: true },
      create: {
        farm_id: farm.id, fiscal_year: PRIOR_YEAR, month, type: 'accounting',
        data_json: accountingData, is_actual: true, comments_json: {},
      },
    });
  }
  console.log('Seeded prior year (FY2025) data');

  console.log('\n--- Seed Complete ---');
  console.log(`Login: farmer@c2farms.com / password123`);
  console.log(`Farm ID: ${farm.id}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
