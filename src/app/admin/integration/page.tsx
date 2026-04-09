'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/integration/llm');
  }, [router]);

  return null;
}
