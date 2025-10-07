import React from 'react';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, description, actions }: PageHeaderProps) {
  const content = subtitle || description;
  return (
    <header className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slat-900 lg:text-3xl">{title}</h1>
        {content ? <p className="mt-2 text-sm text-slat-500 lg:text-base">{content}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export default PageHeader;
