import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      <ThemeProvider>
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Main content area */}
          <main className="flex-1 flex flex-col w-full min-h-screen">
            {children}
          </main>

          {/* Sidebar for Desktop */}
          <div className="hidden lg:flex lg:w-1/2 bg-brand-950 dark:bg-white/5 items-center justify-center p-12">
            <div className="max-w-lg text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome to Admin Dashboard
              </h2>
              <p className="text-gray-400 text-lg">
                Manage your proxy network with ease and precision.
              </p>
            </div>
          </div>

          <div className="fixed bottom-6 right-6 z-50 sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
