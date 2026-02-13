import { useRef, useState } from 'react';
import { Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Papa from 'papaparse';
import CsvImportDialog from './CsvImportDialog';

export default function CsvImportButton({ farmId, fiscalYear, onImportComplete }) {
  const fileRef = useRef();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results);
        setDialogOpen(true);
      },
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleClose = () => {
    setDialogOpen(false);
    setCsvData(null);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        variant="outlined"
        startIcon={<UploadFileIcon />}
        onClick={() => fileRef.current?.click()}
      >
        Import CSV
      </Button>
      {csvData && (
        <CsvImportDialog
          open={dialogOpen}
          onClose={handleClose}
          csvData={csvData}
          farmId={farmId}
          fiscalYear={fiscalYear}
          onImportComplete={onImportComplete}
        />
      )}
    </>
  );
}
