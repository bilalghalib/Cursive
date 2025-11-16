import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cursive - AI-Powered Digital Notebook',
  description: 'Handwriting input with Claude AI conversation',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat&family=Indie+Flower&family=Dancing+Script&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
