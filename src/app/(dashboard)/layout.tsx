import { Sidebar } from "@/components/ui/sidebar";
import { TopBar } from "@/components/ui/topbar";
import { ToastProvider } from "@/components/ui/toast";
import { MobileNav } from "@/components/ui/mobile-nav";
import { AuthSync } from "@/components/auth-sync";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <ToastProvider>
      <AuthSync />
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar user={user} />
        </div>
        {/* Mobile nav */}
        <MobileNav user={user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar user={user} />
          <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
