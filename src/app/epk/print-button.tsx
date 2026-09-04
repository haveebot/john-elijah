"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost btn-sm print:hidden">
      Download PDF
    </button>
  );
}
