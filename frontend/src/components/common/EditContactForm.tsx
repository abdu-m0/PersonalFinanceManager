import React, { useState } from 'react';
import type { Contact } from '../../types';
import { FormInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';

type EditContactFormProps = {
  contact: Contact;
  onSave: (updatedContact: Partial<Contact>) => void;
  onCancel: () => void;
};

export function EditContactForm({ contact, onSave, onCancel }: EditContactFormProps) {
  const [name, setName] = useState(contact.name);
  const [label, setLabel] = useState(contact.label || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [email, setEmail] = useState(contact.email || '');

  const handleSave = () => {
    onSave({
      id: contact.id,
      name,
      label,
      phone,
      email,
    });
  };

  return (
    <div className="space-y-4">
      <FormInput label="Name" value={name} onChange={setName} required />
      <FormInput label="Label" value={label} onChange={setLabel} />
      <FormInput label="Phone" value={phone} onChange={setPhone} />
      <FormInput label="Email" type="email" value={email} onChange={setEmail} />
      <div className="flex justify-end gap-4">
        <button onClick={onCancel} className={buttonClasses.secondary}>
          Cancel
        </button>
        <button onClick={handleSave} className={buttonClasses.primary}>
          Save
        </button>
      </div>
    </div>
  );
}
