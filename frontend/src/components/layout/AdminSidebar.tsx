import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderOpen, FileText,
  Home, BarChart3, Heart, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/donors', label: 'Donors & Contributions', icon: Heart },
  { to: '/admin/caseload', label: 'Caseload Inventory', icon: FolderOpen },
  { to: '/admin/process-recording', label: 'Process Recording', icon: FileText },
  { to: '/admin/visitation', label: 'Home Visitation', icon: Home },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/admin/staff', label: 'Staff Management', icon: Users },
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
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
