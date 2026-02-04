import Head from 'next/head';
import React from 'react';

// Niente alias: import relativo stabile
import { BottomNav, Footer, Header } from '../components';

export type PageProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Layout di pagina: header + contenuto + bottom nav + footer
 */
function Page({ title, className, children }: PageProps): JSX.Element {
  const pageTitle = title === 'Home' ? 'Cats Realm' : `Cats Realm | ${title}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>

      <Header />

      <main>
        <article className={className}>{children}</article>
      </main>

      <BottomNav />
      <Footer />
    </>
  );
}

export default Page;
