export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-brand-600" />
            <span className="text-xl font-semibold text-gray-900">Leen-Co AI</span>
          </div>
          <p className="text-sm text-gray-500">AI assistants trained on your business</p>
        </div>
        {children}
      </div>
    </div>
  );
}
