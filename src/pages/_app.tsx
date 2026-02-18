import type { AppProps } from 'next/app';
import Head from "next/head";
import '@styles/globals.css';
import { ToastProvider } from '@/components/nursediary/Toast';

export default function App({ Component, pageProps }: AppProps) {
  return (
  <>
    <Head>
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#0B1020" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    </Head>

    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  </>
);
}
