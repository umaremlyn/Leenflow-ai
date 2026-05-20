import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
          <Compass size={28} className="text-brand-600" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-3">404</h1>
        <p className="text-sm text-gray-500 mb-6">
          This page doesn't exist. It may have been moved or deleted.
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-brand-800 transition-colors">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
