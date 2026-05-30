import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar (hidden on mobile) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile header (hidden on desktop) */}
      <MobileHeader />

      {/* Main content */}
      <main className="flex-1 pt-16 px-4 pb-20 md:pt-0 md:pb-6 md:ml-56 md:px-6 overflow-x-hidden min-w-0">
        {children}
      </main>

      {/* Mobile bottom nav (hidden on desktop) */}
      <MobileNav />

      <Toaster position="top-right" richColors />
    </div>
  );
}
