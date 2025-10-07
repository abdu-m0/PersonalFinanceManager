import React, { useState, useEffect } from 'react';
import type { Contact } from '../../types';
import { FormInput } from './FormComponents';
import { Button } from './Button';

type ContactFormData = {
  name: string;
  label?: string;
  phone?: string;
  email?: string;
};

type ContactFormProps = {
  onSubmit: (contact: Omit<Contact, 'id'>) => Promise<void>;
  onCancel?: () => void;
  contact?: Contact | null;
  status?: string;
  submitText: string;
};

export function ContactForm({ onSubmit, onCancel, contact, status, submitText }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: contact?.name || '',
    label: contact?.label || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        label: contact.label || '',
        phone: contact.phone || '',
        email: contact.email || '',
      });
    } else {
      setFormData({ name: '', label: '', phone: '', email: '' });
    }
  }, [contact]);

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name || !formData.name.trim()) return;
    try {
      setBusy(true);
      await onSubmit({
        name: formData.name.trim(),
        label: formData.label?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name"
          value={formData.name}
          onChange={(value) => handleChange('name', value)}
          required
        />
        <FormInput
          label="Label (Optional)"
          value={formData.label || ''}
          onChange={(value) => handleChange('label', value)}
          placeholder="e.g., Family, Work, etc."
        />
        <FormInput
          label="Phone (Optional)"
          value={formData.phone || ''}
          onChange={(value) => handleChange('phone', value)}
          type="tel"
        />
        <FormInput
          label="Email (Optional)"
          value={formData.email || ''}
          onChange={(value) => handleChange('email', value)}
          type="email"
        />
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy}>
            {submitText}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        {status && <span className="text-sm text-gray-600">{status}</span>}
      </div>
    </form>
  );
}
