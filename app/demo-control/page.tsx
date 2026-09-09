'use client';
import dynamic from 'next/dynamic';

// We tell Next.js to never prerender this page
export const dynamic = 'force-dynamic';

const DemoControlPage = dynamic(() => import('./DemoControlPage'), { ssr: false });

export default DemoControlPage;
