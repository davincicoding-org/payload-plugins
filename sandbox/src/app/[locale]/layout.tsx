import { NextIntlClientProvider } from 'next-intl';
import './styles.css';

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body>
        <main>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </main>
      </body>
    </html>
  );
}
