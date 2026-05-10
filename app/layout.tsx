import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "@/components/ConditionalLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "No-Show Predictor",
  description: "AI-native scheduling intelligence for healthcare clinics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
