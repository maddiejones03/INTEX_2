import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderOpen, FileText,
  Home, BarChart3, Heart, ChevronLeft, ChevronRight, AlertCircle, Calendar,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/donors', label: 'Donors & Contributions', icon: Heart },
  { to: '/admin/caseload', label: 'Residents', icon: FolderOpen },
  { to: '/admin/process-recording', label: 'Process Recording', icon: FileText },
  { to: '/admin/visitation', label: 'Home Visitation', icon: Home },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/admin/staff', label: 'Staff Management', icon: Users },
  { to: '/admin/early-warning', label: 'Early Warning', icon: AlertCircle },
  { to: '/admin/posting-schedule', label: 'Posting Schedule', icon: Calendar },
];

export default function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-inner">
        <div className="sidebar-collapse-header">
          <button
            type="button"
            className="sidebar-collapse-arrow"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Admin">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
