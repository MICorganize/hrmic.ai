import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

import { SessionProviderWrapper } from "@/providers/session";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "HRMic.ai",
    template: "%s | HRMic.ai",
  },
  description: "HRMic.ai — modern HR management platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
