import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Föhr-Reederei Kassensystem",
  description: "Demo-Kassensystem, Ticketverwaltung, Scanner und Berichte"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}<script dangerouslySetInnerHTML={{__html:`if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} /></body>
    </html>
  );
}
