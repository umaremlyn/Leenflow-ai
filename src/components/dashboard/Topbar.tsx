"use client";
import { Bell, HelpCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props { user: { full_name: string | null; email: string; tenants: { name: string } | null }; }

export default function Topbar({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const initials = (user.full_name ?? user.email).slice(0, 2).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-gray-200 bg-white flex-shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <button className="text-gray-400 hover:text-gray-600 transition-colors"><Bell size={16} /></button>
        <button className="text-gray-400 hover:text-gray-600 transition-colors"><HelpCircle size={16} /></button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
            {initials}
          </div>
          <span className="text-xs text-gray-600 max-w-24 truncate">{user.full_name ?? user.email}</span>
          <button onClick={signOut} className="text-gray-400 hover:text-red-500 transition-colors ml-1">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
