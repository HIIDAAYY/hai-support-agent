'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[admin/error]', error);
    void fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'admin',
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Halaman admin tidak dapat dimuat</h1>
      <p className="text-gray-600 mb-4">
        Terjadi kesalahan saat memuat halaman ini. Silakan coba lagi atau kembali ke dashboard.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => reset()}
          className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
        >
          Coba lagi
        </button>
        <a
          href="/admin"
          className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
        >
          Ke dashboard
        </a>
      </div>
      {process.env.NODE_ENV !== 'production' && error?.message && (
        <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  );
}
