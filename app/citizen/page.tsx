'use client';
import dynamicImport from 'next/dynamic';   // renamed import

export const dynamic = 'force-dynamic';     // this must stay named 'dynamic'

const CitizenPage = dynamicImport(() => import('./CitizenPage'), { ssr: false });

export default CitizenPage;
