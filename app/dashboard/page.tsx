'use client';
import dynamic from 'next/dynamic';

// We tell Next.js to never prerender this page
export const dynamic = 'force-dynamic';

const DashboardPage = dynamic(() => import('./DashboardPage'), { ssr: false });

export default DashboardPage;
