'use client';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const SignalDisplayPage = dynamicImport(() => import('./SignalDisplayPage'), { ssr: false });

export default SignalDisplayPage;
