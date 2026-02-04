import Head from 'next/head';
import React from 'react';

export type PageProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

function Page({ title, className, children }: PageProps): JSX.Element {
  const pageTitle = title === 'Home' ? 'Cats Realm' : `Cats Realm | ${title}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>

      {/* Header minimale (senza dipendenze da src/components) */}
      <header style={{ padding: '16px 16px 0 16px' }}>
        <a href="/" style={{ textDecoration: 'none', fontWeight: 700 }}>
          Cats Realm
        </a>
      </header>

      <main>
        <article className={className}>{children}</article>
      </main>

      {/* Footer minimale */}
      <footer style={{ padding: '24px 16px' }}>
        <small>© {new Date().getFullYear()} Cats Realm</small>
      </footer>
    </>
  );
}

export default Page;
