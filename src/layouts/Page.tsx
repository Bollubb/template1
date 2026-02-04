import Head from 'next/head';
import React from 'react';

// Import diretti (niente barrel ../components che usa alias @components)
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import Header from '../components/Header';

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
