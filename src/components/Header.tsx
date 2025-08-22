import { Users, UserCheck, Building2, Table, BarChart3 } from "lucide-react";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

import { useRole } from '@/context/RoleContext';
const Header = ({ activeSection, onSectionChange }: HeaderProps) => {
  const { role } = useRole();
  const navItems = [
    { id: 'table', label: 'Table', icon: Table },
    { id: 'applicants', label: 'Applicants', icon: Users },
    { id: 'referees', label: 'Referees', icon: UserCheck },
    { id: 'associates', label: 'Associates', icon: Building2 },
    { id: 'vetted', label: 'Vetted', icon: UserCheck },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Data management for koinonia</h1>
              <p className="text-sm text-muted-foreground">Professional Data Management</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`nav-item flex items-center space-x-2 ${
                    isActive ? 'nav-item-active' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="ml-4 text-xs text-gray-600">Role: <span className="font-semibold uppercase">{role}</span></div>
        </div>
      </div>
    </header>
  );
};

export default Header;