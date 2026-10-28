import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
