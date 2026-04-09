import { useEffect, useMemo, useState } from 'react';
import { Users, Mail, Home, Briefcase, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../services/authApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type ResidentApi = {
  residentId: number;
  assignedSocialWorker?: string | null;
};

type SafehouseApi = {
  safehouseId: number;
  name: string;
  city: string;
  capacityGirls: number | null;
  currentOccupancy: number | null;
  totalResidents: number;
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  safeHouseName: string;
  caseload: number;
  isActive: boolean;
};

export default function StaffManagement() {
  useDocumentTitle('Staff Management');
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const base = getApiBaseUrl();
        const [residentsRes, safehousesRes] = await Promise.all([
          fetch(`${base}/api/residents?page=1&pageSize=500`, { credentials: 'include' }),
          fetch(`${base}/api/reports/residents-by-safehouse`, { credentials: 'include' }),
        ]);

        if (!residentsRes.ok || !safehousesRes.ok) {
          throw new Error(`Failed to load staff data (${residentsRes.status}/${safehousesRes.status})`);
        }

        const residentsJson = await residentsRes.json();
        const safehousesJson = await safehousesRes.json();

        const residents: ResidentApi[] = residentsJson.items ?? [];
        const houses: SafehouseApi[] = safehousesJson ?? [];
        setSafehouses(houses);

        const byWorker = new Map<string, number>();
        for (const r of residents) {
          const raw = r.assignedSocialWorker?.trim();
          if (!raw) continue;
          byWorker.set(raw, (byWorker.get(raw) ?? 0) + 1);
        }

        const houseNameByWorker = new Map<string, string>();
        for (const h of houses) {
          // We do not have a dedicated staff table in API yet; mark as "Cross-Safehouse"
          // until backend exposes explicit staff-house assignment.
          void h;
        }

        const staffRows: StaffRow[] = Array.from(byWorker.entries())
          .map(([name, caseload], idx) => ({
            id: `${idx + 1}`,
            name,
            email: 'Not available',
            safeHouseName: houseNameByWorker.get(name) ?? 'Cross-Safehouse',
            caseload,
            isActive: true,
          }))
          .sort((a, b) => b.caseload - a.caseload || a.name.localeCompare(b.name));

        setStaff(staffRows);
      } catch (e) {
        setError((e as Error).message || 'Failed to load staff data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const avgCaseload = useMemo(() => {
    if (staff.length === 0) return 0;
    return Math.round(staff.reduce((s, sw) => s + sw.caseload, 0) / staff.length);
  }, [staff]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Staff Management</h1>
          <p>View and manage social workers and staff assigned to each safe house.</p>
        </div>
      </div>

      <div className="metrics-grid metrics-grid-3">
        <div className="metric-card metric-card-blue">
          <div className="metric-value">{staff.filter((s) => s.isActive).length}</div>
          <div className="metric-label">Active Social Workers</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{safehouses.length}</div>
          <div className="metric-label">Active Safe Houses</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{avgCaseload}</div>
          <div className="metric-label">Avg Caseload</div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {loading && (
        <div className="table-card" style={{ padding: '1rem 1.25rem' }}>
          Loading staff and safehouse data...
        </div>
      )}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Safe House</th>
              <th scope="col">Caseload</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((sw) => (
              <tr key={sw.id}>
                <td>
                  <div className="table-name-cell">
                    <div className="table-avatar"><Users size={12} /></div>
                    <div className="table-name">{sw.name}</div>
                  </div>
                </td>
                <td className="table-secondary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Mail size={12} /> {sw.email}
                  </div>
                </td>
                <td className="table-secondary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Home size={12} /> {sw.safeHouseName}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={12} />
                    <span className={sw.caseload >= 10 ? 'text-danger' : sw.caseload >= 8 ? 'text-warning' : ''}>{sw.caseload} cases</span>
                  </div>
                </td>
                <td><span className={`status-badge status-${sw.isActive ? 'active' : 'inactive'}`}>{sw.isActive ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
            {staff.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="empty-row"><AlertCircle size={16} /> No staff assignment data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }}>Safe Houses</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Location</th>
              <th scope="col">Capacity</th>
              <th scope="col">Occupancy</th>
              <th scope="col">Contact Person</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {safehouses.map((sh) => {
              const capacity = sh.capacityGirls ?? 0;
              const occupancy = sh.currentOccupancy ?? 0;
              const pct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
              return (
                <tr key={sh.safehouseId}>
                  <td><div className="table-name">{sh.name}</div></td>
                  <td className="table-secondary">{sh.city}</td>
                  <td>{capacity}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{occupancy}/{capacity}</span>
                      <div className="capacity-bar" style={{ width: '60px' }}>
                        <div className={`capacity-fill ${pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'good'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`capacity-pct ${pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'good'}`}>{pct}%</span>
                    </div>
                  </td>
                  <td className="table-secondary">Not available</td>
                  <td><span className="status-badge status-active">Active</span></td>
                </tr>
              );
            })}
            {safehouses.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="empty-row"><AlertCircle size={16} /> No safehouse data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
