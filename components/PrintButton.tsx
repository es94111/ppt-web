"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return <button className="btn small" onClick={() => window.print()}><Printer size={16} />列印 / 另存 PDF</button>;
}
