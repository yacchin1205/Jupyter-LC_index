import React from 'react';

type Props = {
  label: string;
  onClick?: () => void;
};

export function Header({ label, onClick }: Props) {
  return (
    <div className="lc-index-header">
      <h1>{label}</h1>
      {onClick && (
        <div
          className="ui-button-icon ui-icon ui-icon-extlink"
          onClick={onClick}
        ></div>
      )}
    </div>
  );
}
