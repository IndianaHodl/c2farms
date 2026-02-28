import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import prisma from '../config/database.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ============ Locations ============

// GET /:farmId/inventory/locations
router.get('/:farmId/inventory/locations', async (req, res, next) => {
  try {
    const locations = await prisma.inventoryLocation.findMany({
      where: { farm_id: req.params.farmId },
      orderBy: { sort_order: 'asc' },
      include: { _count: { select: { bins: true } } },
    });
    res.json(locations);
  } catch (err) { next(err); }
});

// POST /:farmId/inventory/locations
router.post('/:farmId/inventory/locations', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, location_type, region, sort_order } = req.body;
    const location = await prisma.inventoryLocation.upsert({
      where: { farm_id_name: { farm_id: req.params.farmId, name } },
      update: { location_type, region, sort_order },
      create: { farm_id: req.params.farmId, name, location_type: location_type || 'production', region, sort_order: sort_order || 0 },
    });
    res.json(location);
  } catch (err) { next(err); }
});

// ============ Bins ============

// GET /:farmId/inventory/bins
router.get('/:farmId/inventory/bins', async (req, res, next) => {
  try {
    const { location } = req.query;
    const where = { farm_id: req.params.farmId };
    if (location) where.location_id = location;
    const bins = await prisma.inventoryBin.findMany({
      where,
      include: { location: { select: { name: true, id: true } } },
      orderBy: [{ location: { sort_order: 'asc' } }, { bin_number: 'asc' }],
    });
    res.json(bins);
  } catch (err) { next(err); }
});

// POST /:farmId/inventory/bins
router.post('/:farmId/inventory/bins', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { location_id, bin_number, bin_type, size_bu, notes } = req.body;
    const bin = await prisma.inventoryBin.upsert({
      where: { farm_id_location_id_bin_number: { farm_id: req.params.farmId, location_id, bin_number: String(bin_number) } },
      update: { bin_type, size_bu, notes },
      create: { farm_id: req.params.farmId, location_id, bin_number: String(bin_number), bin_type, size_bu, notes },
    });
    res.json(bin);
  } catch (err) { next(err); }
});

// ============ Snapshots ============

// GET /:farmId/inventory/snapshot-dates
router.get('/:farmId/inventory/snapshot-dates', async (req, res, next) => {
  try {
    const rows = await prisma.inventorySnapshot.findMany({
      where: { farm_id: req.params.farmId },
      distinct: ['snapshot_date'],
      select: { snapshot_date: true },
      orderBy: { snapshot_date: 'desc' },
    });
    res.json(rows.map(r => r.snapshot_date));
  } catch (err) { next(err); }
});

// GET /:farmId/inventory/snapshots?date=&location=
router.get('/:farmId/inventory/snapshots', async (req, res, next) => {
  try {
    const { date, location } = req.query;
    const where = { farm_id: req.params.farmId };
    if (date) where.snapshot_date = new Date(date);
    if (location) where.bin = { location_id: location };

    const snapshots = await prisma.inventorySnapshot.findMany({
      where,
      include: {
        bin: {
          include: { location: { select: { name: true, id: true } } },
        },
      },
      orderBy: [{ bin: { location: { sort_order: 'asc' } } }, { bin: { bin_number: 'asc' } }],
    });
    res.json(snapshots);
  } catch (err) { next(err); }
});

// POST /:farmId/inventory/snapshots/batch
router.post('/:farmId/inventory/snapshots/batch', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { snapshots } = req.body; // [{bin_id, snapshot_date, commodity, bushels, kg, crop_year, notes}]
    const results = [];
    for (const s of snapshots) {
      const result = await prisma.inventorySnapshot.upsert({
        where: { farm_id_bin_id_snapshot_date: { farm_id: req.params.farmId, bin_id: s.bin_id, snapshot_date: new Date(s.snapshot_date) } },
        update: { commodity: s.commodity, bushels: s.bushels || 0, kg: s.kg || 0, crop_year: s.crop_year, notes: s.notes },
        create: { farm_id: req.params.farmId, bin_id: s.bin_id, snapshot_date: new Date(s.snapshot_date), commodity: s.commodity, bushels: s.bushels || 0, kg: s.kg || 0, crop_year: s.crop_year, notes: s.notes },
      });
      results.push(result);
    }
    res.json({ count: results.length });
  } catch (err) { next(err); }
});

// ============ Summary (Crop × Location matrix) ============

// GET /:farmId/inventory/summary?date=
router.get('/:farmId/inventory/summary', async (req, res, next) => {
  try {
    const { date } = req.query;
    const where = { farm_id: req.params.farmId };
    if (date) where.snapshot_date = new Date(date);

    const snapshots = await prisma.inventorySnapshot.findMany({
      where,
      include: { bin: { include: { location: { select: { name: true } } } } },
    });

    // Build crop × location matrix
    const matrix = {};
    const locations = new Set();
    const commodities = new Set();

    for (const s of snapshots) {
      const loc = s.bin.location.name;
      const comm = s.commodity || 'Unknown';
      locations.add(loc);
      commodities.add(comm);
      if (!matrix[comm]) matrix[comm] = {};
      matrix[comm][loc] = (matrix[comm][loc] || 0) + s.kg;
    }

    // Build totals
    const locationTotals = {};
    const commodityTotals = {};
    let grandTotal = 0;
    for (const comm of commodities) {
      let commTotal = 0;
      for (const loc of locations) {
        const val = matrix[comm]?.[loc] || 0;
        locationTotals[loc] = (locationTotals[loc] || 0) + val;
        commTotal += val;
      }
      commodityTotals[comm] = commTotal;
      grandTotal += commTotal;
    }

    res.json({
      matrix,
      locations: [...locations].sort(),
      commodities: [...commodities].sort(),
      locationTotals,
      commodityTotals,
      grandTotal,
    });
  } catch (err) { next(err); }
});

// ============ Comparison (month-over-month) ============

// GET /:farmId/inventory/comparison?date1=&date2=
router.get('/:farmId/inventory/comparison', async (req, res, next) => {
  try {
    const { date1, date2 } = req.query;
    if (!date1 || !date2) return res.status(400).json({ error: 'date1 and date2 required' });

    const farmId = req.params.farmId;

    const [snap1, snap2] = await Promise.all([
      prisma.inventorySnapshot.findMany({
        where: { farm_id: farmId, snapshot_date: new Date(date1) },
        include: { bin: { include: { location: { select: { name: true } } } } },
      }),
      prisma.inventorySnapshot.findMany({
        where: { farm_id: farmId, snapshot_date: new Date(date2) },
        include: { bin: { include: { location: { select: { name: true } } } } },
      }),
    ]);

    // Aggregate by commodity × location for each date
    function aggregate(snapshots) {
      const result = {};
      for (const s of snapshots) {
        const key = `${s.commodity || 'Unknown'}||${s.bin.location.name}`;
        result[key] = (result[key] || 0) + s.kg;
      }
      return result;
    }

    const agg1 = aggregate(snap1);
    const agg2 = aggregate(snap2);
    const allKeys = new Set([...Object.keys(agg1), ...Object.keys(agg2)]);

    const rows = [];
    const locations = new Set();
    const commodities = new Set();

    for (const key of allKeys) {
      const [commodity, location] = key.split('||');
      locations.add(location);
      commodities.add(commodity);
      const kg1 = agg1[key] || 0;
      const kg2 = agg2[key] || 0;
      rows.push({ commodity, location, kg_date1: kg1, kg_date2: kg2, change_kg: kg2 - kg1 });
    }

    res.json({
      date1, date2, rows,
      locations: [...locations].sort(),
      commodities: [...commodities].sort(),
    });
  } catch (err) { next(err); }
});

// ============ Commodity Conversions ============

// GET /:farmId/inventory/conversions
router.get('/:farmId/inventory/conversions', async (req, res, next) => {
  try {
    const conversions = await prisma.commodityConversion.findMany({
      where: { farm_id: req.params.farmId },
      orderBy: { commodity: 'asc' },
    });
    res.json(conversions);
  } catch (err) { next(err); }
});

// PUT /:farmId/inventory/conversions
router.put('/:farmId/inventory/conversions', requireRole('admin'), async (req, res, next) => {
  try {
    const { conversions } = req.body; // [{commodity, lbs_per_bu}]
    const results = [];
    for (const c of conversions) {
      const result = await prisma.commodityConversion.upsert({
        where: { farm_id_commodity: { farm_id: req.params.farmId, commodity: c.commodity } },
        update: { lbs_per_bu: c.lbs_per_bu },
        create: { farm_id: req.params.farmId, commodity: c.commodity, lbs_per_bu: c.lbs_per_bu },
      });
      results.push(result);
    }
    res.json(results);
  } catch (err) { next(err); }
});

// ============ Excel Import ============

// Detect date sheets like "Oct 31, 25", "Nov 30, 25", "Dec 31, 25"
const DATE_SHEET_RE = /^(\w{3})\s+(\d{1,2}),\s*(\d{2,4})$/;

function parseSheetDate(name) {
  const m = name.match(DATE_SHEET_RE);
  if (!m) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const mon = months[m[1]];
  if (mon === undefined) return null;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  // Use UTC to avoid timezone shifts on the date-only column
  return new Date(Date.UTC(year, mon, parseInt(m[2], 10)));
}

// Normalize bin type casing
function normalizeBinType(raw) {
  if (!raw) return null;
  const s = raw.trim();
  // Title case common types
  const lower = s.toLowerCase();
  if (lower === 'hopper') return 'Hopper';
  if (lower === 'bag') return 'Bag';
  if (lower === 'jhopper') return 'Hopper';
  return s; // Keep the rest as-is (GSI, MERIDIAN, etc. are brand names)
}

// POST /:farmId/inventory/import-excel
router.post('/:farmId/inventory/import-excel', requireRole('admin', 'manager'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const farmId = req.params.farmId;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    // Find date sheets
    const dateSheets = [];
    for (const ws of workbook.worksheets) {
      const d = parseSheetDate(ws.name);
      if (d) dateSheets.push({ sheet: ws, date: d, name: ws.name });
    }

    if (dateSheets.length === 0) {
      return res.status(400).json({ error: 'No date sheets found (expected format: "Oct 31, 25")' });
    }

    // Load conversion factors for this farm
    const conversions = await prisma.commodityConversion.findMany({
      where: { farm_id: farmId },
    });
    const convMap = {};
    for (const c of conversions) {
      convMap[c.commodity.toLowerCase()] = c.lbs_per_bu;
    }

    const stats = { locations: 0, bins: 0, snapshots: 0, sheets: [] };
    const locationCache = {};
    const binCache = {};

    for (const { sheet, date, name } of dateSheets) {
      let sheetSnapshots = 0;

      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const farmName = cellValue(row.getCell(1));
        if (!farmName) continue;

        const binNumber = String(cellValue(row.getCell(2)) || '').trim();
        if (!binNumber) continue;

        const binType = normalizeBinType(cellValue(row.getCell(3)));
        const sizeBu = numValue(row.getCell(4));
        const commodityShort = cellValue(row.getCell(5));
        const commodityLong = cellValue(row.getCell(6));
        const bushels = numValue(row.getCell(7)) || 0;
        const kgRaw = numValue(row.getCell(8));
        const cropYear = numValue(row.getCell(9));
        const rawNotes = cellValue(row.getCell(10));
        const notes = rawNotes != null ? String(rawNotes).trim() || null : null;

        // Auto-create location
        const locKey = `${farmId}:${farmName}`;
        if (!locationCache[locKey]) {
          const loc = await prisma.inventoryLocation.upsert({
            where: { farm_id_name: { farm_id: farmId, name: farmName } },
            update: {},
            create: { farm_id: farmId, name: farmName, location_type: guessLocationType(farmName) },
          });
          locationCache[locKey] = loc;
          stats.locations++;
        }
        const location = locationCache[locKey];

        // Auto-create bin
        const binKey = `${farmId}:${location.id}:${binNumber}`;
        if (!binCache[binKey]) {
          const bin = await prisma.inventoryBin.upsert({
            where: { farm_id_location_id_bin_number: { farm_id: farmId, location_id: location.id, bin_number: binNumber } },
            update: { bin_type: binType, size_bu: sizeBu },
            create: { farm_id: farmId, location_id: location.id, bin_number: binNumber, bin_type: binType, size_bu: sizeBu },
          });
          binCache[binKey] = bin;
          stats.bins++;
        }
        const bin = binCache[binKey];

        // Calculate KG if not provided
        let kg = kgRaw || 0;
        if (bushels > 0 && kg === 0 && commodityShort) {
          const lbsPerBu = convMap[commodityShort.toLowerCase()];
          if (lbsPerBu) {
            kg = bushels * lbsPerBu * 0.45359237;
          }
        }

        const commodity = commodityLong || commodityShort || null;

        // Upsert snapshot
        await prisma.inventorySnapshot.upsert({
          where: { farm_id_bin_id_snapshot_date: { farm_id: farmId, bin_id: bin.id, snapshot_date: date } },
          update: { commodity, bushels, kg, crop_year: cropYear ? Math.round(cropYear) : null, notes },
          create: { farm_id: farmId, bin_id: bin.id, snapshot_date: date, commodity, bushels, kg, crop_year: cropYear ? Math.round(cropYear) : null, notes },
        });
        sheetSnapshots++;
      }

      stats.sheets.push({ name, date: date.toISOString().slice(0, 10), snapshots: sheetSnapshots });
      stats.snapshots += sheetSnapshots;
    }

    res.json(stats);
  } catch (err) { next(err); }
});

// Helper: extract cell value (handles formula results)
function cellValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  if (typeof cell.value === 'object' && cell.value.result !== undefined) return cell.value.result;
  if (typeof cell.value === 'object' && cell.value.formula) return null; // formula with no cached result
  return cell.value;
}

function numValue(cell) {
  const v = cellValue(cell);
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function guessLocationType(name) {
  const n = name.toLowerCase();
  if (['lgx', 'ogema'].includes(n)) return 'transit';
  if (n === 'waldron') return 'satellite';
  return 'production';
}

export default router;
