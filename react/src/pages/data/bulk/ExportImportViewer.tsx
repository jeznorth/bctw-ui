import { ButtonGroup } from '@material-ui/core';
import Button from 'components/form/Button';
import Export from 'pages/data/bulk/Export';
import Import from 'pages/data/bulk/Import';
import { useState } from 'react';

type IImportExportProps<T> = {
  iTitle?: string;
  iMsg?: string;
  eTitle?: string;
  eMsg?: string;
  data: T[];
  iDisabled?: boolean;
  eDisabled?: boolean;
};

export default function ImportExportViewer<T>({ data, iTitle, iMsg, eTitle, eMsg, iDisabled = false, eDisabled = false }: IImportExportProps<T>): JSX.Element {
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const handleClickExport = (): void => setShowExportModal(o => !o);

  const handleClickImport = (): void => setShowImportModal(o => !o);

  const handleClose = (): void => {
    setShowExportModal(false);
    setShowImportModal(false);
  }

  const importProps = { title: iTitle, message: iMsg, handleClose, open: showImportModal }
  const exportProps = { title: eTitle, message: eMsg, data, handleClose, open: showExportModal }

  return (
    <>
      <ButtonGroup size='small' variant='contained' color='primary'>
        <Button disabled={iDisabled} onClick={handleClickImport}>import</Button>
        <Button disabled={eDisabled} onClick={handleClickExport}>export</Button>
      </ButtonGroup>
      {iDisabled ? null : <Import {...importProps} />}
      {eDisabled ? null : <Export {...exportProps} />}
    </>
  );
}
