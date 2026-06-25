import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/theme/theme-provider";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { pwaInstallScript } from "@/components/pwa/install-prompt-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JM Control Center",
    template: "%s · JM Control Center",
  },
  description:
    "Sistema integral de JM Designs Worldwide: ventas, clientes, contratos, facturas, finanzas e inteligencia.",
  manifest: "/manifest.webmanifest",
  applicationName: "JM Control Center",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JM Control",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: pwaInstallScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
      >
        <ThemeProvider>
          <SettingsProvider>
            {children}
            <ServiceWorkerRegister />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
