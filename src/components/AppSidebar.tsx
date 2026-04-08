import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  ClipboardList,
  Users,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: Package },
  { title: "Record Sale", url: "/sales", icon: ShoppingCart },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Shopping List", url: "/shopping-list", icon: ClipboardList },
  { title: "Customers", url: "/customers", icon: Users },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, role } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Filter nav items based on user role
  const visibleNavItems = role === "cashier"
    ? navItems.filter(item => item.url === "/products" || item.url === "/sales")
    : navItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-sm font-bold text-sidebar-primary-foreground">PM</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-fade-in">
              <span className="text-sm font-bold text-sidebar-accent-foreground">
                PoultryMart
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Sales Manager
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {/* User Profile Section */}
        {profile && !collapsed && (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
            <p className="text-xs font-semibold truncate text-sidebar-foreground">
              {profile.full_name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              @{profile.username}
            </p>
            <p className="text-xs text-sidebar-foreground/50 capitalize mt-1">
              {profile.role}
            </p>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
