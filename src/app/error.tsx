"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("[GlobalError]", error); }, [error]);

  return (
    <html><body>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">
            An unexpected error occurred. Our team has been notified.
            {error.digest && <span className="block mt-1 font-mono text-xs text-gray-400">Ref: {error.digest}</span>}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset}
              className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-800 transition-colors">
              <RefreshCw size={14} /> Try again
            </button>
            <a href="/dashboard"
              className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Home size={14} /> Go to dashboard
            </a>
          </div>
        </div>
      </div>
    </body></html>
  );
}
