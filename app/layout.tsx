import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/toaster-provider";

const font = Figtree({
  variable: "--font-sans-family",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: { default: "FlowVoice", template: "%s · FlowVoice" },
  description: "Create AI employees that call, qualify and follow up with your leads.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${font.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
