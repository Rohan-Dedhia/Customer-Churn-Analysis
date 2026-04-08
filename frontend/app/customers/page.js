'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomerModal from '@/components/CustomerModal';
import { Plus, Edit2, Trash2, Search, RefreshCw, Filter, X } from 'lucide-react';

const API = 'https://customer-churn-analysis-backend.onrender.com';
const PAGE_SIZE = 500;

export default function CustomersPage() {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [page,         setPage]         = useState(0);

  // Filter options — fetched from server immediately on mount
  const [filterOptions, setFilterOptions] = useState({ genders: [], countries: [], occupations: [] });

  // Active filter values
  const [search,        setSearch]        = useState('');
  const [filterGender,  setFilterGender]  = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterOcc,     setFilterOcc]     = useState('');

  const [modal, setModal] = useState(null);
  const debounceRef = useRef(null);
  const abortRef    = useRef(null);

  // ── Fetch distinct filter options once on mount ────────────────────────────
  useEffect(() => {
    fetch(`${API}/customers/filters`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFilterOptions(data); })
      .catch(() => {});
  }, []);

  // ── Fetch one page from the backend, with current filters applied ──────────
  const doFetch = async (skip, reset) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (reset) { setLoading(true); setHasMore(true); }
    else         setLoadingMore(true);

    const params = new URLSearchParams({ skip, limit: PAGE_SIZE });
    if (search.trim())   params.set('search',     search.trim());
    if (filterGender)    params.set('gender',      filterGender);
    if (filterCountry)   params.set('country',     filterCountry);
    if (filterOcc)       params.set('occupation',  filterOcc);

    try {
      const res = await fetch(`${API}/customers/?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const sorted = [...data].sort((a, b) => a.customerkey - b.customerkey);
      if (reset) {
        setCustomers(sorted);
        setPage(0);
      } else {
        setCustomers(prev => [...prev, ...sorted].sort((a, b) => a.customerkey - b.customerkey));
        setPage(p => p + 1);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ── Re-fetch on filter change (debounce text search 300 ms) ───────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const delay = search ? 300 : 0;
    debounceRef.current = setTimeout(() => doFetch(0, true), delay);
    return () => clearTimeout(debounceRef.current);
  }, [search, filterGender, filterCountry, filterOcc]); // eslint-disable-line

  const hasActiveFilter = !!(search || filterGender || filterCountry || filterOcc);
  const clearFilters = () => { setSearch(''); setFilterGender(''); setFilterCountry(''); setFilterOcc(''); };
  const maxKey = useMemo(() => customers.reduce((m, c) => Math.max(m, c.customerkey || 0), 0), [customers]);

  const handleDelete = async (customerkey) => {
    if (!confirm('Permanently delete this customer record?')) return;
    try {
      const res = await fetch(`${API}/customers/${customerkey}`, { method: 'DELETE' });
      if (res.ok) setCustomers(prev => prev.filter(c => c.customerkey !== customerkey));
    } catch (err) { console.error(err); }
  };

  const handleSaved = (saved, isEdit) => {
    setCustomers(prev => {
      const updated = isEdit
        ? prev.map(c => c.customerkey === saved.customerkey ? saved : c)
        : [...prev, saved];
      return updated.sort((a, b) => a.customerkey - b.customerkey);
    });
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Customer Management</h2>
          <p>
            {loading ? 'Querying database…' : `${customers.length.toLocaleString()} records`}
            {hasActiveFilter ? ' matched from full dataset' : ' loaded · sorted by ID'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => doFetch(0, true)} disabled={loading}>
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Reload
          </button>
          <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })}>
            <Plus size={15} />
            Add Customer
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <Filter size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
        <span className="filter-label">Filters:</span>

        {/* Text search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200,
          background: 'var(--bg-input)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)', padding: '6px 10px',
        }}>
          <Search size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <input
            id="customer-search"
            type="text"
            placeholder="Name, country, city, occupation…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <select id="gender-filter" className="form-select" value={filterGender}
          onChange={e => setFilterGender(e.target.value)} style={{ minWidth: 130 }}>
          <option value="">All Genders</option>
          {filterOptions.genders.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <select id="country-filter" className="form-select" value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Countries</option>
          {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select id="occupation-filter" className="form-select" value={filterOcc}
          onChange={e => setFilterOcc(e.target.value)} style={{ minWidth: 150 }}>
          <option value="">All Occupations</option>
          {filterOptions.occupations.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {hasActiveFilter && (
          <button className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}
            onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th style={{ width: 50 }}>Age</th>
                <th>Country</th>
                <th>City</th>
                <th>Occupation</th>
                <th style={{ textAlign: 'center', width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && customers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
                  {hasActiveFilter ? 'Searching database…' : 'Loading customers…'}
                </td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
                  No customers match the selected filters.
                </td></tr>
              ) : customers.map(c => (
                <tr key={c.customerkey}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {c.customerkey}
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.givenname} {c.surname}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.gender || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.age || '—'}</td>
                  <td>{c.countryfull || c.country || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.city || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.occupation || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button className="btn btn-ghost" style={{ padding: '5px 9px' }} title="Edit"
                        onClick={() => setModal({ mode: 'edit', customer: c })}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-danger-ghost" title="Delete"
                        onClick={() => handleDelete(c.customerkey)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {customers.length > 0 && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {customers.length.toLocaleString()} records
              {hasActiveFilter ? ' matched from full database' : ' loaded'}
              {loading && ' · refreshing…'}
            </span>
            {hasMore && !hasActiveFilter && (
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }}
                onClick={() => doFetch(page * PAGE_SIZE + PAGE_SIZE, false)}
                disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load next ${PAGE_SIZE.toLocaleString()} records`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* CRUD Modal */}
      {modal && (
        <CustomerModal
          mode={modal.mode}
          customer={modal.customer}
          maxKey={maxKey}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}
