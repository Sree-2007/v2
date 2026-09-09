'use client';
import dynamic from 'next/dynamic';

// We tell Next.js to never prerender this page
export const dynamic = 'force-dynamic';

const SignalDisplayPage = dynamic(() => import('./SignalDisplayPage'), { ssr: false });

export default SignalDisplayPage;
