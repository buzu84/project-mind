import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/ai/rate-limiter";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  // Detect auth provider
  let authProvider = "email";
  if (user) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const provider = data?.user?.app_metadata?.provider;
      if (provider && provider !== "email") {
        authProvider = provider;
      }
    } catch {
      // Fallback to email
    }
  }

  const isAdmin = user ? isAdminUser(user) : false;

  return <SettingsContent user={user} authProvider={authProvider} isAdmin={isAdmin} />;
}
