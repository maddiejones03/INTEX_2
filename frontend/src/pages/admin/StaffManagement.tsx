import { Users, Mail, Home, Briefcase } from 'lucide-react';
import { mockSocialWorkers, mockSafeHouses } from '../../services/mockData';

export default function StaffManagement() {
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
          <div className="metric-value">{mockSocialWorkers.filter((s) => s.isActive).length}</div>
          <div className="metric-label">Active Social Workers</div>
        </div>
        <div className="metric-card metric-card-green">
          <div className="metric-value">{mockSafeHouses.filter((s) => s.isActive).length}</div>
          <div className="metric-label">Active Safe Houses</div>
        </div>
        <div className="metric-card metric-card-amber">
          <div className="metric-value">{Math.round(mockSocialWorkers.reduce((s, sw) => s + sw.caseload, 0) / mockSocialWorkers.length)}</div>
          <div className="metric-label">Avg Caseload</div>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Safe House</th>
              <th>Caseload</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockSocialWorkers.map((sw) => (
              <tr key={sw.id}>
                <td>
                  <div className="table-name-cell">
                    <div className="table-avatar"><Users size={12} /></div>
                    <div className="table-name">{sw.firstName} {sw.lastName}</div>
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
          </tbody>
        </table>
      </div>

      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }}>Safe Houses</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Capacity</th>
              <th>Occupancy</th>
              <th>Contact Person</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockSafeHouses.map((sh) => {
              const pct = Math.round((sh.currentOccupancy / sh.capacity) * 100);
              return (
                <tr key={sh.id}>
                  <td><div className="table-name">{sh.name}</div></td>
                  <td className="table-secondary">{sh.location}</td>
                  <td>{sh.capacity}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{sh.currentOccupancy}/{sh.capacity}</span>
                      <div className="capacity-bar" style={{ width: '60px' }}>
                        <div className={`capacity-fill ${pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'good'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`capacity-pct ${pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'good'}`}>{pct}%</span>
                    </div>
                  </td>
                  <td className="table-secondary">{sh.contactPerson}</td>
                  <td><span className={`status-badge status-${sh.isActive ? 'active' : 'inactive'}`}>{sh.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
