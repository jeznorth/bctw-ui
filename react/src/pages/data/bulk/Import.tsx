import { Typography } from '@material-ui/core';
import { IBulkUploadResults } from 'api/api_interfaces';
import { NotificationMessage } from 'components/common';
import { ExportImportProps } from 'components/component_interfaces';
import Button from 'components/form/Button';
import FileInput from 'components/form/FileInput';
import Modal from 'components/modal/Modal';
import { useResponseDispatch } from 'contexts/ApiResponseContext';
import { useTelemetryApi } from 'hooks/useTelemetryApi';
import React from 'react';
import { formatAxiosError } from 'utils/common';

import bulkStyles from './bulk_styles';

/* todo: 
  force refetch or set cache of T on successful mutation
  copyrow?
*/

/**
 * 
 * @param message whats displayed as body of import modal
 * @param handleToast handler from parent, called when mutation is complete
 */
export default function Import<T>(props: ExportImportProps): JSX.Element {
  const styles = bulkStyles();
  const bctwApi = useTelemetryApi();
  const responseDispatch = useResponseDispatch();

  const onSuccess = (data: IBulkUploadResults<T>): void => 
    responseDispatch({type: 'success', message: `a bulk upload was completed ${data.errors.length ? ', but there were errors.' : 'successfully.'}`})

  const { mutateAsync, isIdle, isLoading, isSuccess, isError, error, data, reset } = (bctwApi.useMutateBulkCsv as any)({onSuccess});

  const handleFileChange = (fieldName: string, files: FileList): void => {
    const formData = new FormData();
    if (!files.length) return;
    Array
      .from(Array(files.length).keys())
      .map(i => formData.append(fieldName, files[i], files[i].name))
    save(formData);
  }

  const save = async (form: FormData): Promise<void> => await mutateAsync(form);

  const copy = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, row: JSON): void => {
    // todo:
    event.preventDefault();
  }

  const onClose = (): void => {
    reset();
    props.handleClose(false);
  }

  const importHadErrors = (): boolean => isSuccess && data.errors.length > 0;

  const renderResults = (data: IBulkUploadResults<T>): React.ReactNode => {
    const { errors, results } = data;
    if (errors.length) {
      return <>
        {
          errors.map(e => {
            return (
              <div key={e.rownum}>
                <span className={styles.errRow}>Row {e.rownum}</span>
                <span className={styles.err}>{e.error}</span>
                <a className={styles.errRow} href='/#' onClick={(event): void => copy(event, e.row)}>Copy Row</a>
              </div>
            )
          })
        }
      </>
    }
    const numSuccessful = results.length
    const msg = `${numSuccessful} item${numSuccessful > 1 ? 's' : ''} ${numSuccessful > 1 ? 'were ' : 'was'} successfully imported`;
    return <NotificationMessage type='success' message={msg} />
  }

  return (
    <Modal {...props} handleClose={onClose}>
      {isLoading ? <div>saving...</div> : null}
      {isError ? <NotificationMessage type='error' message={formatAxiosError(error)} /> : null}
      {isSuccess ? renderResults(data) : null}
      {
        isIdle ?
          <>
            <Typography>{props.message ?? ''}</Typography>
            <Typography>Make sure the first row matches the specified headers exactly.</Typography>
          </>
          : null
      }
      <div className={styles.footer}>
        {isIdle ? <FileInput onFileChosen={handleFileChange} /> : null}
        {isSuccess || isError ? <Button variant='contained' onClick={reset}>{`${importHadErrors() ? 'try' : 'upload'} again`}</Button> : null}
      </div>
    </Modal>
  )
}