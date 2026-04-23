'use client';

import { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app/error]', error);
    void fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'app',
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Maaf, terjadi kesalahan.</h1>
      <p style={{ marginBottom: 16, color: '#555' }}>
        Sistem sedang mengalami kendala. Silakan coba lagi.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: '8px 16px',
          border: '1px solid #333',
          borderRadius: 4,
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        Coba lagi
      </button>
    </div>
  );
}
