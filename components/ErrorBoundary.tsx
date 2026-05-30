
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-news-black p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">რაღაც შეცდომა მოხდა</h1>
          <p className="text-gray-500 mb-6 max-w-md">
            ბოდიშს გიხდით შეფერხებისთვის. ჩვენი გუნდი უკვე მუშაობს პრობლემის აღმოფხვრაზე.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-news-black text-white px-6 py-3 rounded-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={18} />
            გვერდის გადატვირთვა
          </button>
          {import.meta.env.MODE === 'development' && this.state.error && (
            <pre className="mt-8 p-4 bg-gray-200 rounded text-xs text-left overflow-auto max-w-lg">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
