import ConfirmDialog from '../shared/ConfirmDialog';

export default function FreezeDialog({ open, onConfirm, onCancel, fiscalYear }) {
  return (
    <ConfirmDialog
      open={open}
      title="Freeze Budget"
      message={`Are you sure you want to freeze the FY${fiscalYear} budget? This will create a snapshot of current monthly data as the frozen budget reference. An admin can unfreeze later if needed.`}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText="Freeze Budget"
      confirmColor="warning"
    />
  );
}
