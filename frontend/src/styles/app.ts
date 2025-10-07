import { buttonClasses, surfaceClasses, formClasses } from './classes';

export const appClasses = {
  section: surfaceClasses.card,
  formGrid: formClasses.gridTwo,
  buttonPrimary: buttonClasses.primary,
  buttonSecondary: buttonClasses.secondary,
  notification: 'rounded-xl border px-3 py-2 text-sm font-medium',
  notificationInfo: 'border-blue-200 bg-blue-50 text-blue-600',
  notificationSuccess: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  notificationError: 'border-rose-200 bg-rose-50 text-rose-600'
} as const;

// Legacy style object for components not yet migrated to Tailwind utilities
export const appStyles = {
  section: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)'
  },
  formGrid: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: '1fr 1fr'
  },
  buttonPrimary: {
    padding: '0 18px',
    borderRadius: '8px',
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    height: '42px',
    lineHeight: '42px'
  },
  buttonSecondary: {
    padding: '0 14px',
    borderRadius: '8px',
    border: '1px solid #94a3b8',
    background: 'transparent',
    color: '#1e293b',
    fontSize: '13px',
    cursor: 'pointer',
    height: '42px',
    lineHeight: '40px',
    boxSizing: 'border-box'
  },
  notification: {
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    marginBottom: '16px'
  },
  notificationInfo: {
    background: '#e0f2fe',
    color: '#0c4a6e'
  },
  notificationSuccess: {
    background: '#dcfce7',
    color: '#166534'
  },
  notificationError: {
    background: '#fee2e2',
    color: '#b91c1c'
  }
} as const;
