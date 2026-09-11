import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { WebVitals } from "@/components/web-vitals";

const kanit = localFont({
  variable: "--font-kanit",
  // Avoid making both font weights compete with the route's critical scripts.
  // The self-hosted files still load from generated CSS and `swap` keeps text visible.
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
  src: [
    {
      path: "../public/fonts/humansoft/Kanit-Regular.woff2",
      weight: "300 400",
      style: "normal",
    },
    {
      path: "../public/fonts/humansoft/Kanit-Medium.woff2",
      weight: "500 700",
      style: "normal",
    },
  ],
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
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
