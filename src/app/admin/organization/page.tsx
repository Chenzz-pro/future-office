'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/organization/structure');
  }, [router]);

  return null;
}
