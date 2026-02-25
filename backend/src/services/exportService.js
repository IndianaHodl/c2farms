import ExcelJS from 'exceljs';
import prisma from '../config/database.js';
import { generateFiscalMonths } from '../utils/fiscalYear.js';
import { getFarmCategories } from './categoryService.js';

export async function generateExcel(farmId, fiscalYear) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'C2 Farms';

  const assumption = await prisma.assumption.findUnique({
    where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
  });

  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  const months = generateFiscalMonths(assumption?.start_month || 'Nov');
  const farmCategories = await getFarmCategories(farmId);

  // Sheet 1: Per-Unit
  const perUnitSheet = workbook.addWorksheet('Per-Unit Analysis');
  const perUnitData = await prisma.monthlyData.findMany({
    where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'per_unit' },
  });

  const perUnitMap = {};
  for (const row of perUnitData) {
    perUnitMap[row.month] = row.data_json || {};
  }

  // Header row
  const headerRow = ['Category', ...months, 'Total'];
  perUnitSheet.addRow(headerRow);
  perUnitSheet.getRow(1).font = { bold: true };

  for (const cat of farmCategories) {
    const indent = '  '.repeat(cat.level);
    const row = [`${indent}${cat.display_name}`];
    let total = 0;
    for (const month of months) {
      const val = perUnitMap[month]?.[cat.code] || 0;
      row.push(val);
      total += val;
    }
    row.push(total);
    const excelRow = perUnitSheet.addRow(row);
    if (cat.level === 0) excelRow.font = { bold: true };
  }

  // Auto-fit columns
  perUnitSheet.columns.forEach(col => { col.width = 16; });
  perUnitSheet.getColumn(1).width = 35;

  // Sheet 2: Accounting
  const accountingSheet = workbook.addWorksheet('Accounting Statement');
  const accountingData = await prisma.monthlyData.findMany({
    where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'accounting' },
  });

  const accountingMap = {};
  for (const row of accountingData) {
    accountingMap[row.month] = row.data_json || {};
  }

  accountingSheet.addRow(headerRow);
  accountingSheet.getRow(1).font = { bold: true };

  for (const cat of farmCategories) {
    const indent = '  '.repeat(cat.level);
    const row = [`${indent}${cat.display_name}`];
    let total = 0;
    for (const month of months) {
      const val = accountingMap[month]?.[cat.code] || 0;
      row.push(val);
      total += val;
    }
    row.push(total);
    const excelRow = accountingSheet.addRow(row);
    if (cat.level === 0) excelRow.font = { bold: true };
  }

  accountingSheet.columns.forEach(col => { col.width = 16; });
  accountingSheet.getColumn(1).width = 35;

  // Sheet 3: GL Detail (if GL accounts exist)
  const glAccounts = await prisma.glAccount.findMany({
    where: { farm_id: farmId, is_active: true },
    include: { category: true },
    orderBy: { account_number: 'asc' },
  });

  if (glAccounts.length > 0) {
    const glSheet = workbook.addWorksheet('GL Detail');
    const glActuals = await prisma.glActualDetail.findMany({
      where: { farm_id: farmId, fiscal_year: fiscalYear },
      include: { gl_account: true },
    });

    const glHeader = ['Account #', 'Account Name', 'Category', ...months, 'Total'];
    glSheet.addRow(glHeader);
    glSheet.getRow(1).font = { bold: true };

    for (const gl of glAccounts) {
      const row = [gl.account_number, gl.account_name, gl.category?.display_name || 'Unmapped'];
      let total = 0;
      for (const month of months) {
        const actual = glActuals.find(a => a.gl_account_id === gl.id && a.month === month);
        const val = actual?.amount || 0;
        row.push(val);
        total += val;
      }
      row.push(total);
      glSheet.addRow(row);
    }

    glSheet.columns.forEach(col => { col.width = 16; });
    glSheet.getColumn(1).width = 14;
    glSheet.getColumn(2).width = 30;
    glSheet.getColumn(3).width = 22;
  }

  // Sheet: Assumptions
  if (assumption) {
    const assSheet = workbook.addWorksheet('Assumptions');
    assSheet.addRow(['Farm', farm?.name || '']);
    assSheet.addRow(['Fiscal Year', fiscalYear]);
    assSheet.addRow(['Total Acres', assumption.total_acres]);
    assSheet.addRow([]);
    assSheet.addRow(['Crops']);
    assSheet.addRow(['Name', 'Acres', 'Target Yield', 'Price/Unit']);
    const crops = assumption.crops_json || [];
    for (const crop of crops) {
      assSheet.addRow([crop.name, crop.acres, crop.target_yield, crop.price_per_unit]);
    }
    assSheet.addRow([]);
    assSheet.addRow(['Bins']);
    assSheet.addRow(['Name', 'Capacity', 'Opening Balance', 'Grain Type']);
    const bins = assumption.bins_json || [];
    for (const bin of bins) {
      assSheet.addRow([bin.name, bin.capacity, bin.opening_balance, bin.grain_type]);
    }
    assSheet.columns.forEach(col => { col.width = 18; });
  }

  // Format currency columns
  for (const sheet of [perUnitSheet, accountingSheet]) {
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      for (let col = 2; col <= months.length + 2; col++) {
        const cell = row.getCell(col);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      }
    });
  }

  return workbook;
}

export async function generatePdf(farmId, fiscalYear) {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });

  const assumption = await prisma.assumption.findUnique({
    where: { farm_id_fiscal_year: { farm_id: farmId, fiscal_year: fiscalYear } },
  });
  const months = generateFiscalMonths(assumption?.start_month || 'Nov');
  const farmCategories = await getFarmCategories(farmId);

  const accountingData = await prisma.monthlyData.findMany({
    where: { farm_id: farmId, fiscal_year: fiscalYear, type: 'accounting' },
  });

  const accountingMap = {};
  for (const row of accountingData) {
    accountingMap[row.month] = row.data_json || {};
  }

  // Build table body
  const tableBody = [];
  tableBody.push([
    { text: 'Category', bold: true },
    ...months.map(m => ({ text: m, bold: true, alignment: 'right' })),
    { text: 'Total', bold: true, alignment: 'right' },
  ]);

  for (const cat of farmCategories) {
    const indent = '  '.repeat(cat.level);
    const row = [{ text: `${indent}${cat.display_name}`, bold: cat.level === 0 }];
    let total = 0;
    for (const month of months) {
      const val = accountingMap[month]?.[cat.code] || 0;
      row.push({ text: formatCurrency(val), alignment: 'right' });
      total += val;
    }
    row.push({ text: formatCurrency(total), alignment: 'right', bold: cat.level === 0 });
    tableBody.push(row);
  }

  const startMonth = assumption?.start_month || 'Nov';
  const endMonth = assumption?.end_month || 'Oct';

  const docDefinition = {
    pageOrientation: 'landscape',
    pageSize: 'LEGAL',
    content: [
      { text: `${farm?.name || 'Farm'} - Operating Statement`, style: 'header' },
      { text: `Fiscal Year ${fiscalYear} (${startMonth} ${fiscalYear - 1} - ${endMonth} ${fiscalYear})`, style: 'subheader' },
      { text: ' ' },
      {
        table: {
          headerRows: 1,
          widths: [120, ...months.map(() => 55), 60],
          body: tableBody,
        },
        layout: 'lightHorizontalLines',
        fontSize: 7,
      },
    ],
    styles: {
      header: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] },
      subheader: { fontSize: 11, color: '#666', margin: [0, 0, 0, 10] },
    },
    defaultStyle: { fontSize: 7 },
  };

  return docDefinition;
}

function formatCurrency(val) {
  if (val === 0) return '-';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
