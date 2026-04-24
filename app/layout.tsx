import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "物品资产管理",
  description: "个人物品资产管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
