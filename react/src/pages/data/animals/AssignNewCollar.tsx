import { useState } from 'react';
import Button from 'components/form/Button';
import Modal from 'components/modal/Modal';
import Table from 'components/table/Table';
import { availableCollarProps, eCollarAssignedStatus, ICollar } from 'types/collar';
import { CritterStrings as CS } from 'constants/strings';

type IAssignNewCollarModal = {
  show: boolean;
  onClose: (close: boolean) => void;
  onSave: (collar_id: string) => void;
};

/**
 * displays collars that can be assigned to this critter
 * @param {onSave} - parent component {PerformAssignment} handles this
 * collar row must be selected in order to enable the save button
 */
export default function AssignNewCollarModal({ show, onClose, onSave }: IAssignNewCollarModal): JSX.Element {
  const [collarId, setCollarId] = useState<string>('');
  const handleSelect = (row: ICollar): void => setCollarId(row.collar_id);

  return (
    <>
      <Modal open={show} handleClose={onClose}>
        <Table
          headers={availableCollarProps}
          title={CS.collarAssignmentTitle}
          rowIdentifier='collar_id'
          queryProps={{ query: 'useCollarType', queryParam: eCollarAssignedStatus.Available }}
          onSelect={handleSelect}
        />
        <Button disabled={collarId === ''} onClick={(): void => onSave(collarId)}>{CS.assignCollarBtnText}</Button>
      </Modal>
    </>
  );
}
