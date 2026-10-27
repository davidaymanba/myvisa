"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Direction } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Direction.Provider dir={dir}>
        <MotionConfig reducedMotion="user">
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster dir={dir} />
          </QueryClientProvider>
        </MotionConfig>
      </Direction.Provider>
    </ThemeProvider>
  );
}
