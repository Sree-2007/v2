'use client';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const PolicePage = dynamicImport(() => import('./PolicePage'), { ssr: false });

export default PolicePage;
