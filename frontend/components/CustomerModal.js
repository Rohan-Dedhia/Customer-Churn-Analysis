'use client';
import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

const FIELDS = [
  { key: 'givenname',    label: 'First Name',    type: 'text',   required: true },
  { key: 'surname',      label: 'Last Name',     type: 'text',   required: true },
  { key: 'gender',       label: 'Gender',        type: 'select', options: ['Male','Female',''] },
  { key: 'age',          label: 'Age',           type: 'number'  },
  { key: 'birthday',     label: 'Birthday',      type: 'date'    },
  { key: 'occupation',   label: 'Occupation',    type: 'text'    },
  { key: 'company',      label: 'Company',       type: 'text'    },
  { key: 'streetaddress',label: 'Street Address',type: 'text'    },
  { key: 'city',         label: 'City',          type: 'text'    },
  { key: 'state',        label: 'State',         type: 'text'    },
  { key: 'country',      label: 'Country Code',  type: 'text'    },
  { key: 'countryfull',  label: 'Country Full',  type: 'text'    },
  { key: 'zipcode',      label: 'Zip Code',      type: 'text'    },
  { key: 'continent',    label: 'Continent',     type: 'text'    },
];

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, '']));

export default function CustomerModal({ mode, customer, maxKey, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(isEdit ? { ...customer } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (payload.age) payload.age = parseInt(payload.age);
      if (!isEdit) payload.customerkey = maxKey + 1;

      const url    = isEdit ? `https://customer-churn-analysis-backend.onrender.com/customers/${customer.customerkey}` : 'https://customer-churn-analysis-backend.onrender.com/customers/';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Request failed');
      }
      const saved = await res.json();
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', zIndex: 200,
        }}
      />

      {/* Modal Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: 2 }}>
              {isEdit ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isEdit ? `Record #${customer.customerkey}` : `Will be assigned key #${maxKey + 1}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px 8px', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body (scrollable) */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {error && (
            <div className="error-banner" style={{ marginBottom: 16 }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {FIELDS.map(({ key, label, type, options, required }) => (
              <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
                </label>
                {type === 'select' ? (
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={form[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    required={required}
                  >
                    {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                  </select>
                ) : (
                  <input
                    type={type || 'text'}
                    className="form-input"
                    value={form[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    required={required}
                  />
                )}
              </div>
            ))}
          </div>
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {isEdit ? 'Save Changes' : 'Create Customer'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
