'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MonitorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/monitor/alerts');
  }, [router]);

  return null;
}
