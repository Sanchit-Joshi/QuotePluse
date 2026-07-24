"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PreviewToolbar({ pdfHref }: { pdfHref: string }) {
  return (
    <div className="mb-4 flex justify-end gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" /> Print
      </Button>
      <Button
        nativeButton={false}
        render={
          <a href={pdfHref} target="_blank" rel="noreferrer">
            <Download className="size-4" /> Download PDF
          </a>
        }
      />
    </div>
  );
}
