'use client';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const DemoControlPage = dynamicImport(() => import('./DemoControlPage'), { ssr: false });

export default DemoControlPage;
