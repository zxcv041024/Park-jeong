import type { Metadata } from "next";
import { ServiceWorkerCleanup } from "@/components/ServiceWorkerCleanup";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAFIA | AI Piano Coach",
  description: "Simply Piano style falling notes plus generative AI piano coaching."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
