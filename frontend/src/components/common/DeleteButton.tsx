import React from 'react';
import { buttonClasses } from '../../styles/classes';

type DeleteButtonProps = {
  onClick: () => void;
  children?: React.ReactNode;
};

export function DeleteButton({ onClick, children = 'Delete' }: DeleteButtonProps) {
  return (
    <button className={buttonClasses.danger} onClick={onClick}>
      {children}
    </button>
  );
}
