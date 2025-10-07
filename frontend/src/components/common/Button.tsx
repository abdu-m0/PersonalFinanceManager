import React from 'react';
import { buttonClasses } from '../../styles/classes';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonClasses;
  children: React.ReactNode;
};

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const className = `${buttonClasses[variant]} ${props.className || ''}`;
  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
}
