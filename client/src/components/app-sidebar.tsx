import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Phone,
  MessageSquare,
  Calendar,
  LogOut,
} from "lucide-react";
import logoUrl from "@assets/Mop_Mafia_Logo_PNG_1767503227218.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Customers", url: "/customers", icon: UserCheck },
  { title: "Calls", url: "/calls", icon: Phone },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Jobs", url: "/jobs", icon: Calendar },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoUrl} 
            alt="Mop Mafia" 
            className="h-12 w-auto max-w-[180px] object-contain"
            data-testid="img-logo"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate" data-testid="text-user-email">{user.email}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
        <div className="text-xs text-muted-foreground">
          Serving Raleigh & Triangle Area
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
