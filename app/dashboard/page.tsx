'use client';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const DashboardPage = dynamicImport(() => import('./DashboardPage'), { ssr: false });

export default DashboardPage;
