'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ff6b4a', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Loading...</div>
      </div>
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
