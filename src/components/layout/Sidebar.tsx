import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Globe,
  FileText,
  ArrowUpDown,
  FileUser,
  LayoutDashboard,
  Moon,
  Sun,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/crawl', icon: Globe, label: 'Crawl & Scrape' },
  { path: '/extract', icon: FileText, label: 'Extract' },
  { path: '/sort', icon: ArrowUpDown, label: 'Sort' },
  { path: '/cv', icon: FileUser, label: 'CV Generator' },
];

export function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <Link to="/" className={cn(
          "flex items-center gap-3",
          isCollapsed && "justify-center w-full"
        )}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-semibold text-lg text-sidebar-foreground">AI Job Scraper</h1>
              <p className="text-xs text-muted-foreground">Kenya Focus</p>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse Toggle Button */}
      <div className={cn("px-4 py-2 border-b border-sidebar-border", isCollapsed && "px-2")}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full nav-link justify-center hover:bg-accent/50 min-h-[44px]",
            isCollapsed && "p-2"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-8 h-8 text-sidebar-foreground" />
          ) : (
            <>
              <span className="flex-1 text-left font-medium">Collapse</span>
              <ChevronLeft className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Workflow
          </p>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'nav-link',
                isActive && 'nav-link-active',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "transition-all flex-shrink-0",
                isCollapsed ? "w-6 h-6" : "w-5 h-5"
              )} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className={cn("p-4 border-t border-sidebar-border", isCollapsed && "p-2")}>
        <button
          onClick={toggleTheme}
          className={cn(
            "nav-link w-full min-h-[44px]",
            isCollapsed ? "justify-center p-2" : "justify-between"
          )}
          title={isCollapsed ? (theme === 'dark' ? 'Dark Mode' : 'Light Mode') : undefined}
        >
          {isCollapsed ? (
            theme === 'dark' ? (
              <Moon className="w-10 h-10 text-sidebar-foreground" />
            ) : (
              <Sun className="w-10 h-10 text-sidebar-foreground" />
            )
          ) : (
            <>
              <span className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </span>
              <div className={cn(
                "w-10 h-6 rounded-full relative transition-colors",
                theme === 'dark' ? 'bg-primary' : 'bg-muted'
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-transform",
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                )} />
              </div>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
