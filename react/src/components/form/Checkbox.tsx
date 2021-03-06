import React, { useState } from 'react';
import { Checkbox as MuiCheckbox, CheckboxProps } from '@material-ui/core/';
import { FormControlLabel } from '@material-ui/core';
import { IInputProps } from 'components/component_interfaces';
import { columnToHeader, removeProps } from 'utils/common';

interface ICheckboxProps extends IInputProps, CheckboxProps {
  initialValue: boolean;
  label: string;
}
export default function Checkbox(props: ICheckboxProps): JSX.Element {
  const { initialValue, label, changeHandler } = props;

  const [checked, setChecked] = useState(initialValue);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = event.target.checked;
    setChecked(checked);
    changeHandler({[label]: checked });
  };

  // passing props that dont belong in dom is throwing errors
  const propsToPass = removeProps(props, ['changeHandler', 'initialValue']);

  return (
    <>
      <FormControlLabel
        control={
          <MuiCheckbox
            checked={checked}
            onChange={handleChange}
            {...propsToPass}
          />
        }
        label={columnToHeader(label)}
      />
    </>
  );
}