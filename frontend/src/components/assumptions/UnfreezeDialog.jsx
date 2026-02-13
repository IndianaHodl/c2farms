import ConfirmDialog from '../shared/ConfirmDialog';

export default function UnfreezeDialog({ open, onConfirm, onCancel, fiscalYear }) {
  return (
    <ConfirmDialog
      open={open}
      title="Unfreeze Budget"
      message={`Are you sure you want to unfreeze the FY${fiscalYear} budget? This will allow editing of assumptions and budget data again. The frozen snapshot will be kept for forecast comparisons.`}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText="Unfreeze Budget"
      confirmColor="info"
    />
  );
}
