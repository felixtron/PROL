import { cn } from "./cn";

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r border-border bg-surface",
        className
      )}
    >
      {children}
    </aside>
  );
}

interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn("flex h-16 items-center border-b border-border px-5", className)}>
      {children}
    </div>
  );
}

interface SidebarNavProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarNav({ children, className }: SidebarNavProps) {
  return (
    <nav className={cn("flex-1 space-y-1 overflow-y-auto p-3", className)}>
      {children}
    </nav>
  );
}

interface SidebarNavItemProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export function SidebarNavItem({
  href,
  icon,
  children,
  active = false,
  className,
}: SidebarNavItemProps) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-50 text-primary-700"
          : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
        className
      )}
    >
      {icon && <span className="h-5 w-5">{icon}</span>}
      {children}
    </a>
  );
}

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn("border-t border-border p-4", className)}>
      {children}
    </div>
  );
}
