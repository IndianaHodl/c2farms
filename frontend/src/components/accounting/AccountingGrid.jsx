import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Box, Alert } from '@mui/material';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import api from '../../services/api';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getGridColors } from '../../utils/gridColors';
import { FISCAL_MONTHS } from '../../utils/fiscalYear';
import { formatCurrency } from '../../utils/formatting';

export default function AccountingGrid({ farmId, fiscalYear, onSummaryLoaded }) {
  const [rowData, setRowData] = useState([]);
  const [summary, setSummary] = useState({});
  const [totalAcres, setTotalAcres] = useState(0);
  const [error, setError] = useState('');
  const gridRef = useRef();
  const { mode } = useThemeMode();
  const colors = useMemo(() => getGridColors(mode), [mode]);

  const fetchData = useCallback(async () => {
    if (!farmId || !fiscalYear) return;
    try {
      const res = await api.get(`/api/farms/${farmId}/accounting/${fiscalYear}`);
      setRowData(res.data.rows || []);
      const newSummary = res.data.summary || {};
      setSummary(newSummary);
      setTotalAcres(res.data.totalAcres || 0);
      onSummaryLoaded?.(newSummary);
    } catch {
      setError('Failed to load accounting data');
    }
  }, [farmId, fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onCellValueChanged = useCallback(async (params) => {
    const { data, colDef } = params;
    const month = colDef.field?.replace('months.', '');
    if (!month || !FISCAL_MONTHS.includes(month)) return;

    const value = params.newValue;
    try {
      await api.patch(`/api/farms/${farmId}/accounting/${fiscalYear}/${month}`, {
        category_code: data.code,
        value: parseFloat(value) || 0,
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update cell');
      fetchData();
    }
  }, [farmId, fiscalYear, fetchData]);

  const fullRowData = useMemo(() => {
    if (rowData.length === 0) return [];

    const computedRows = [
      ...rowData,
      {
        code: '_gross_margin',
        display_name: 'Gross Margin',
        level: -1,
        months: {},
        total: 0,
        isComputed: true,
      },
      {
        code: '_operating_income',
        display_name: 'Operating Income / Cash Flow',
        level: -1,
        months: {},
        total: 0,
        isComputed: true,
      },
    ];

    const gmRow = computedRows.find(r => r.code === '_gross_margin');
    const oiRow = computedRows.find(r => r.code === '_operating_income');

    if (gmRow && oiRow) {
      let gmTotal = 0, oiTotal = 0;
      for (const month of FISCAL_MONTHS) {
        const s = summary[month] || {};
        gmRow.months[month] = s.grossMargin || 0;
        oiRow.months[month] = s.operatingIncome || 0;
        gmTotal += s.grossMargin || 0;
        oiTotal += s.operatingIncome || 0;
      }
      gmRow.total = gmTotal;
      oiRow.total = oiTotal;
    }

    return computedRows;
  }, [rowData, summary]);

  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'Category',
        field: 'display_name',
        pinned: 'left',
        width: 220,
        cellStyle: (params) => {
          if (params.data?.isComputed) {
            return { fontWeight: 'bold', backgroundColor: colors.computedBg, borderTop: `2px solid ${colors.computedBorder}` };
          }
          const indent = (params.data?.level || 0) * 20;
          const bold = params.data?.level === 0;
          return {
            paddingLeft: `${indent + 8}px`,
            fontWeight: bold ? 'bold' : 'normal',
            backgroundColor: bold ? colors.parentRow : undefined,
          };
        },
      },
    ];

    for (const month of FISCAL_MONTHS) {
      cols.push({
        headerName: month,
        field: `months.${month}`,
        width: 110,
        type: 'numericColumn',
        editable: (params) => {
          if (params.data?.isComputed) return false;
          // Only leaf categories are editable (those with no children in the hierarchy)
          const hasChildren = rowData.some(r => r.parent_code === params.data?.code);
          if (hasChildren) return false;
          return true;
        },
        valueGetter: (params) => params.data?.months?.[month] || 0,
        valueSetter: (params) => {
          if (!params.data.months) params.data.months = {};
          params.data.months[month] = parseFloat(params.newValue) || 0;
          return true;
        },
        valueFormatter: (p) => formatCurrency(p.value, 0),
        cellStyle: (params) => {
          if (params.data?.isComputed) {
            return {
              fontWeight: 'bold',
              backgroundColor: colors.computedBg,
              color: (params.value || 0) < 0 ? colors.negativeText : colors.positiveText,
            };
          }
          return {};
        },
      });
    }

    cols.push({
      headerName: 'Total',
      field: 'total',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (p) => formatCurrency(p.value, 0),
      cellStyle: (params) => ({
        fontWeight: 'bold',
        backgroundColor: params.data?.isComputed ? colors.totalComputedBg : colors.totalBg,
        color: params.data?.isComputed && (params.value || 0) < 0 ? colors.negativeText : undefined,
      }),
    });

    return cols;
  }, [colors]);

  const gridTheme = mode === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
      <div className={gridTheme} style={{ height: 700, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: false, suppressMovable: true }}
          onCellValueChanged={onCellValueChanged}
          getRowId={(params) => params.data.code}
          animateRows={false}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
        />
      </div>
    </Box>
  );
}
