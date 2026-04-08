'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SchedulerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/scheduler/tasks');
  }, [router]);

  return null;
}
