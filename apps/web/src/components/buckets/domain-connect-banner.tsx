"use client";

import { Zap } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DomainConnectBanner() {
  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-blue-600" />
          <CardTitle className="text-sm">
            Automatic DNS setup available
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Your DNS provider supports automatic configuration. Use the "Apply
          automatically" buttons below to set up DNS records without leaving the
          dashboard.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
