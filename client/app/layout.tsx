import type { Metadata } from "next";
import "./globals.css";
import { Epilogue } from "next/font/google"
import { Providers } from "./providers"
import { Header } from "@/components/Header";
import { Toaster } from "sonner";


const Font = Epilogue({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Specula",
  description: "Social Prediction Market",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${Font.className} antialiased`}
      >
        <Providers>
          <div className="min-h-screen bg-[#f0f0f0] text-black">
            <Header />

            <main className="max-w-6xl mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster 
              position="bottom-right"
              toastOptions={{
                className: 'border-2 border-black shadow-[4px_4px_0px_#000] font-bold rounded-none',
                style: {
                  background: 'white',
                  color: 'black',
                }
              }}
            />
          </div>
        </Providers>
      </body>
    </html>
  );
}
