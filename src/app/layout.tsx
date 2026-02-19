import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academic Asia - Student Management System",
  description: "Comprehensive student recruitment and school application management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
