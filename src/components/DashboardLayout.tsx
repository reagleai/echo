import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, Settings, History, LogOut, User, Menu, X } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import ReadOnlyOverlay from "@/components/ReadOnlyOverlay";
import WhyLockedFab, { type WhyLockedFabRef } from "@/components/WhyLockedFab";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "How It Works", href: "/how-it-works", icon: LayoutDashboard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { isGuest } = useGuestMode();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const fabRef = useRef<WhyLockedFabRef>(null);

  const handleLockedClick = useCallback(() => {
    fabRef.current?.shake();
  }, []);

  const isAnonymous = user?.is_anonymous === true || !user?.email;
  const displayName = isAnonymous ? "Guest" : (user?.user_metadata?.full_name || user?.email);
  const initials = isAnonymous
    ? "G"
    : user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-lg font-bold text-foreground">Echo</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={location.pathname === item.href ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg border border-border shadow-md">
                {!isAnonymous && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="gap-2">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="gap-2">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> {isAnonymous ? "Exit Guest" : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-card p-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant={location.pathname === item.href ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="container py-8 flex flex-col min-h-[calc(100vh-3.5rem)]">
        <ReadOnlyOverlay onLockedClick={handleLockedClick}>
          <div className="flex-1 pb-8 md:pb-0">
            {children}
          </div>
        </ReadOnlyOverlay>
        {isGuest && (
          <div className="mt-auto pt-6 md:hidden flex justify-center">
            <WhyLockedFab ref={fabRef} inline />
          </div>
        )}
      </main>
      {isGuest && (
        <div className="hidden md:block">
          <WhyLockedFab ref={fabRef} />
        </div>
      )}
    </div>
  );
}
