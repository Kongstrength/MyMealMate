import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "กินดี | วางแผนมื้ออาหารให้พอดีกับคุณ",
  description: "ผู้ช่วยวางแผนอาหารและงบประมาณสำหรับทุกมื้อ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
