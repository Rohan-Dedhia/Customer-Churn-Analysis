'use client';
import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, Database, Filter, Users, DollarSign, TrendingDown, Activity, RotateCcw, Download } from 'lucide-react';

const GEO_COLORS = ['#f97316','#22d3a8','#38bdf8','#a78bfa','#fb7185','#fbbf24','#34d399','#60a5fa'];

/* ---- Custom Tooltip ----------------------------------------- */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', lineHeight: 1.6,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      {label && <p style={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

/* ---- KPI Card ----------------------------------------------- */
function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="kpi-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <span className="kpi-label">{label}</span>
        <div style={{ width:36, height:36, borderRadius:8, background:`${color}22`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <p style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:6 }}>{sub}</p>}
    </div>
  );
}

/* ---- Custom Pie Legend -------------------------------------- */
const renderCustomLegend = (geoData) => (
  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
    {geoData.slice(0,8).map((entry, i) => (
      <div key={entry.country} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.75rem' }}>
        <div style={{ width:10, height:10, borderRadius:2, background:GEO_COLORS[i%GEO_COLORS.length], flexShrink:0 }} />
        <span style={{ color:'var(--text-secondary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {entry.country}
        </span>
        <span style={{ color:'var(--text-primary)', fontWeight:600, flexShrink:0 }}>
          {Number(entry.num_customers).toLocaleString()}
        </span>
      </div>
    ))}
  </div>
);

/* ---- Helpers ----------------------------------------------- */
const fmtCurrency = (n) =>
  n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n/1_000).toFixed(0)}K`
  : `$${(n||0).toFixed(0)}`;

/* ---- Main Page --------------------------------------------- */
export default function DashboardPage() {
  const [cohortData,    setCohortData]    = useState([]);
  const [retentionData, setRetentionData] = useState([]);
  const [segmentData,   setSegmentData]   = useState([]);
  const [geoData,       setGeoData]       = useState([]);

  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastSync,   setLastSync]   = useState(new Date());

  // Filters
  const [yearFilter,   setYearFilter]   = useState('ALL');
  const [rebuilding,   setRebuilding]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Top Customers
  const [topCustomers, setTopCustomers] = useState([]);
  const [topLimit,     setTopLimit]     = useState(10);
  const [loadingTop,   setLoadingTop]   = useState(false);

  /* ---- Fetch ---------------------------------------------- */
  const fetchData = async () => {
    setLoading(true); setFetchError(false);
    try {
      const urls = [
        'https://customer-churn-analysis-17h4.onrender.com/analytics/cohort',
        'https://customer-churn-analysis-17h4.onrender.com/analytics/retention',
        'https://customer-churn-analysis-17h4.onrender.com/analytics/segmentation',
        'https://customer-churn-analysis-17h4.onrender.com/analytics/geography',
      ];
      const responses = await Promise.all(urls.map(u => fetch(u)));
      if (responses.some(r => !r.ok)) { setFetchError(true); return; }
      const [d1,d2,d3,d4] = await Promise.all(responses.map(r => r.json()));
      setCohortData(Array.isArray(d1)?d1:[]);
      setRetentionData(Array.isArray(d2)?d2:[]);
      setSegmentData(Array.isArray(d3)?d3:[]);
      setGeoData(Array.isArray(d4)?d4:[]);
      setLastSync(new Date());
    } catch { setFetchError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchTopCustomers = async () => {
    setLoadingTop(true);
    try {
      const params = new URLSearchParams({ limit: topLimit, year: yearFilter, status: statusFilter });
      const res = await fetch(`https://customer-churn-analysis-17h4.onrender.com/analytics/top_customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTopCustomers(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoadingTop(false); }
  };

  useEffect(() => { fetchTopCustomers(); }, [yearFilter, statusFilter, topLimit]);

  /* ---- Rebuild materialized view + refetch ---------------  */
  const rebuildAndSync = async () => {
    setRebuilding(true);
    try {
      await fetch('https://customer-churn-analysis-17h4.onrender.com/analytics/refresh', { method: 'POST' });
    } catch { /* ignore network error */ }
    finally { setRebuilding(false); }
    await fetchData();
    await fetchTopCustomers();
  };

  /* ---- Derived -------------------------------------------- */
  const years = useMemo(() =>
    [...new Set(segmentData.map(d => d.cohort_year))].sort(), [segmentData]);

  // Use segmentData for Customers & Revenue (all cohorts, full lifetime)
  const filteredSegment = useMemo(() =>
    yearFilter === 'ALL' ? segmentData : segmentData.filter(d => String(d.cohort_year) === yearFilter),
    [segmentData, yearFilter]);

  // Use retentionData for churn (filters out recent cohorts correctly)
  const filteredRetention = useMemo(() => {
    let r = retentionData;
    if (yearFilter   !== 'ALL') r = r.filter(d => String(d.cohort_year) === yearFilter);
    if (statusFilter !== 'ALL') r = r.filter(d => d.customer_status === statusFilter);
    return r;
  }, [retentionData, yearFilter, statusFilter]);

  /* ---- KPIs ---------------------------------------------- */
  // Total customers: unique customers from segmentData (each customer counted once, in their cohort)
  const totalCustomers = filteredSegment.reduce((s,d) => s + (Number(d.total_customers)||0), 0);
  
  // Total revenue: lifetime revenue from segmentData
  const totalRevenue   = filteredSegment.reduce((s,d) => s + (Number(d.total_revenue)||0), 0);
  
  // Avg revenue per customer
  const avgRevPerUser  = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  
  // Churn rate: from retentionData (customers in qualifying cohorts only)
  const totalRetention = filteredRetention.reduce((s,d) => s + (Number(d.num_customers)||0), 0);
  const churned        = filteredRetention.filter(d => d.customer_status === 'Churned')
                           .reduce((s,d) => s + (Number(d.num_customers)||0), 0);
  const churnRate      = totalRetention > 0 ? ((churned/totalRetention)*100).toFixed(1) : '0.0';

  /* ---- Area chart data (pivot retention by cohort_year) --- */
  const retentionAreaData = useMemo(() => {
    const map = {};
    retentionData.forEach(d => {
      if (yearFilter !== 'ALL' && String(d.cohort_year) !== yearFilter) return;
      if (!map[d.cohort_year]) map[d.cohort_year] = { cohort_year: d.cohort_year, Active:0, Churned:0 };
      map[d.cohort_year][d.customer_status] = Number(d.num_customers) || 0;
    });
    return Object.values(map).sort((a,b) => a.cohort_year - b.cohort_year);
  }, [retentionData, yearFilter]);

  /* ---- Handlers ------------------------------------------- */
  const handleExportCSV = () => {
    if (!topCustomers.length) return;
    const headers = ['ID', 'First Name', 'Last Name', 'Country', 'Cohort Year', 'Status', 'Lifetime Revenue'];
    const rows = topCustomers.map(c => [
      c.customerkey,
      `"${c.givenname || ''}"`,
      `"${c.surname || ''}"`,
      `"${c.country || ''}"`,
      c.cohort_year,
      c.customer_status,
      c.total_revenue
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `top_customers_${yearFilter}_${statusFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ---- Render -------------------------------------------- */
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Contoso Analytics</h2>
          <p>Live PostgreSQL data · synced {lastSync.toLocaleTimeString()}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            id="rebuild-btn"
            className="btn btn-ghost"
            onClick={rebuildAndSync}
            disabled={rebuilding || loading}
            title="Refreshes the cohort_analysis materialized view then reloads all charts"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCcw size={15} style={rebuilding ? { animation: 'spin 1s linear infinite' } : {}} />
            {rebuilding ? 'Rebuilding DB…' : 'Rebuild & Sync'}
          </button>
          <button id="sync-btn" className="btn btn-ghost" onClick={fetchData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Syncing…' : 'Sync'}
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="error-banner">
          <div className="error-banner-title"><Database size={18}/>PostgreSQL Execution Failed</div>
          <p>Could not reach the backend. Ensure <code>uvicorn</code> is running and <code>.env</code> credentials are correct.</p>
        </div>
      )}

      {!fetchError && (
        <>
          {/* ---- Filter Bar ---- */}
          <div className="filter-bar">
            <Filter size={15} color="var(--accent)" style={{ flexShrink:0 }} />
            <span className="filter-label">Filters:</span>

            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>Cohort Year</span>
              <select id="cohort-year-filter" className="form-select" value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}>
                <option value="ALL">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>Status</span>
              <select id="status-filter" className="form-select" value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Churned">Churned</option>
              </select>
            </div>

            {(yearFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:'0.8rem' }}
                onClick={() => { setYearFilter('ALL'); setStatusFilter('ALL'); }}>
                Clear
              </button>
            )}
          </div>

          {/* ---- KPI Cards ---- */}
          <div className="kpi-grid">
            <KpiCard
              label="Total Customers"
              value={loading ? '—' : totalCustomers.toLocaleString()}
              sub={yearFilter === 'ALL' ? 'Across all cohorts' : `Cohort ${yearFilter}`}
              icon={Users} color="var(--accent)"
            />
            <KpiCard
              label="Lifetime Revenue"
              value={loading ? '—' : fmtCurrency(totalRevenue)}
              sub="Net revenue all time (USD equiv.)"
              icon={DollarSign} color="var(--success)"
            />
            <KpiCard
              label="Revenue / Customer"
              value={loading ? '—' : fmtCurrency(avgRevPerUser)}
              sub="Average lifetime value"
              icon={Activity} color="var(--info)"
            />
            <KpiCard
              label="Churn Rate"
              value={loading ? '—' : `${churnRate}%`}
              sub="Lost after 6-month window"
              icon={TrendingDown} color="var(--danger)"
            />
          </div>

          {/* ---- Charts ---- */}
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[360,360,280,280].map((h,i) => (
                <div key={i} className="skeleton" style={{ height:h, borderRadius:'var(--radius-md)' }} />
              ))}
            </div>
          ) : (
            <div className="charts-grid">
              {/* Retention Area — 8 cols */}
              <div className="chart-card col-8" style={{ paddingBottom:8 }}>
                <div className="chart-header">
                  <div className="chart-title">Retention vs Churn by Cohort</div>
                  <div className="chart-subtitle">Active and churned customers per acquisition year</div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={retentionAreaData} margin={{ top:8, right:8, bottom:0, left:0 }}>
                    <defs>
                      <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gChurned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="cohort_year" tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false} width={50}/>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize:'0.8rem', paddingTop:8 }}/>
                    <Area type="monotone" dataKey="Active"  name="Active"  stroke="var(--success)" fill="url(#gActive)"  strokeWidth={2.5}/>
                    <Area type="monotone" dataKey="Churned" name="Churned" stroke="var(--danger)"  fill="url(#gChurned)" strokeWidth={2.5}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Geography — 4 cols, custom legend */}
              <div className="chart-card col-4" style={{ display:'flex', flexDirection:'column' }}>
                <div className="chart-header">
                  <div className="chart-title">Top Customer Regions</div>
                  <div className="chart-subtitle">By distinct customer count</div>
                </div>
                {/* Donut chart with a fixed pixel height so ResponsiveContainer works */}
                <div style={{ height:180, width:'100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={geoData} cx="50%" cy="50%"
                        innerRadius={52} outerRadius={78}
                        paddingAngle={3} dataKey="num_customers" nameKey="country" stroke="none"
                      >
                        {geoData.map((_,i) => <Cell key={i} fill={GEO_COLORS[i%GEO_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom structured legend below */}
                <div style={{ marginTop:12, overflow:'hidden' }}>
                  {renderCustomLegend(geoData)}
                </div>
              </div>

              {/* Revenue Bar — 6 cols */}
              <div className="chart-card col-6">
                <div className="chart-header">
                  <div className="chart-title">Lifetime Revenue by Cohort Year</div>
                  <div className="chart-subtitle">Total all-time net revenue per acquisition cohort</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filteredSegment} margin={{ top:8, right:8, bottom:0, left:0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="cohort_year" tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={v => v >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`}/>
                    <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.04)' }}/>
                    <Bar dataKey="total_revenue" name="Revenue (USD)" fill="var(--success)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue per Customer Line — 6 cols */}
              <div className="chart-card col-6">
                <div className="chart-header">
                  <div className="chart-title">Avg Revenue per Customer</div>
                  <div className="chart-subtitle">Lifetime customer value trend by cohort year</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={filteredSegment} margin={{ top:8, right:8, bottom:0, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="cohort_year" tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'var(--text-secondary)', fontSize:12 }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={v => v >= 1e3 ? `$${(v/1e3).toFixed(0)}K` : `$${v}`}/>
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="customer_revenue" name="Avg Revenue / Customer"
                      stroke="var(--accent)" strokeWidth={2.5}
                      dot={{ r:4, fill:'var(--accent)', strokeWidth:0 }}
                      activeDot={{ r:6, strokeWidth:0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ---- Top Customers Table ---- */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 24 }}>
            <div className="chart-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="chart-title">Top Customers</div>
                <div className="chart-subtitle">Highest lifetime revenue per selected filters</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Show:</span>
                <select 
                  className="form-select" 
                  style={{ padding: '4px 28px 4px 10px', fontSize: '0.8rem', height: 'auto' }}
                  value={topLimit} 
                  onChange={e => setTopLimit(parseInt(e.target.value))}
                >
                  {[5, 10, 15, 20, 25].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={handleExportCSV}
                  disabled={topCustomers.length === 0}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>ID</th>
                    <th>Customer Name</th>
                    <th>Country</th>
                    <th>Cohort Year</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Lifetime Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTop ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>Loading top customers...</td></tr>
                  ) : topCustomers.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>No customers match the current filters.</td></tr>
                  ) : topCustomers.map(c => (
                    <tr key={c.customerkey}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.customerkey}</td>
                      <td style={{ fontWeight: 500 }}>{c.givenname} {c.surname}</td>
                      <td>{c.country || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.cohort_year}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                          background: c.customer_status === 'Active' ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: c.customer_status === 'Active' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {c.customer_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fmtCurrency(c.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
