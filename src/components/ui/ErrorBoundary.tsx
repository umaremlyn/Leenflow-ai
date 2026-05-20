"use client";
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex flex-col items-center justify-center min-h-64 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Something went wrong</h2>
        <p className="text-xs text-gray-500 mb-4 max-w-xs">{this.state.message}</p>
        <button
          onClick={() => this.setState({ hasError: false, message: "" })}
          className="flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:underline"
        >
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    );
  }
}
