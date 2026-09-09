'use client';
import dynamic from 'next/dynamic';

// We tell Next.js to never prerender this page
export const dynamic = 'force-dynamic';

const CitizenPage = dynamic(() => import('./CitizenPage'), { ssr: false });

export default CitizenPage;
