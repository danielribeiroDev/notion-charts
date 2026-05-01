import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  { name: 'Workspaces', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Charts', href: '/charts', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed, notionConnection, logout } = useAppStore();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !sidebarCollapsed || isHovered;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300',
        isExpanded ? 'w-64' : 'w-16'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            {isExpanded && (
              <span className="text-lg font-bold text-foreground">
                Notion<span className="text-primary">Charts</span>
              </span>
            )}
          </Link>
          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const NavItem = (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isExpanded && <span>{item.name}</span>}
              </Link>
            );

            if (!isExpanded) {
              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              );
            }

            return NavItem;
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-2">
          {notionConnection && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5',
                isExpanded ? 'justify-between' : 'justify-center'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                  {notionConnection.workspaceIcon || notionConnection.workspaceName.charAt(0).toUpperCase()}
                </div>
                {isExpanded && (
                  <span className="truncate text-sm text-sidebar-foreground">
                    {notionConnection.workspaceName}
                  </span>
                )}
              </div>
            </div>
          )}
          <div className={cn('mt-2', isExpanded ? 'px-2' : 'flex justify-center')}>
            {isExpanded ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-[#ffffff]"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-[#ffffff]"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
