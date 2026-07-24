/**
 * Hand-written, self-contained CSS for the PDF/preview template. Deliberately
 * NOT Tailwind: this layout must stay pixel-fixed across app rebuilds and
 * render identically whether the browser has the app's compiled stylesheet
 * loaded or not (Playwright's page.setContent has no access to it) — see
 * docs/architecture.md §PDF generation.
 */
export const documentPdfStyles = `
  @page { size: A4; margin: 0; }
  .doc-pdf {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    font-size: 10.5pt;
    line-height: 1.45;
    width: 100%;
    box-sizing: border-box;
    padding: 28px 36px;
  }
  .doc-pdf * { box-sizing: border-box; }
  .doc-pdf .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .doc-pdf .company-block { display: flex; gap: 12px; align-items: flex-start; }
  .doc-pdf .logo { width: 56px; height: 56px; object-fit: contain; }
  .doc-pdf .company-name { font-size: 15pt; font-weight: 700; margin: 0 0 2px; }
  .doc-pdf .company-meta { font-size: 9pt; color: #444; max-width: 320px; }
  .doc-pdf .doc-title-block { text-align: right; }
  .doc-pdf .doc-title { font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
  .doc-pdf .doc-number { font-size: 10.5pt; font-weight: 600; margin-top: 4px; }
  .doc-pdf .doc-dates { font-size: 9pt; color: #444; margin-top: 4px; }
  .doc-pdf .status-badge {
    display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 3px;
    font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    background: #eef2f7; color: #1a1a1a; border: 1px solid #c7d0dc;
  }
  .doc-pdf .parties { display: flex; gap: 20px; margin-bottom: 16px; }
  .doc-pdf .party-box { flex: 1; border: 1px solid #d8d8d8; border-radius: 4px; padding: 10px 12px; }
  .doc-pdf .party-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 700; margin-bottom: 4px; }
  .doc-pdf .party-name { font-size: 11pt; font-weight: 700; margin-bottom: 2px; }
  .doc-pdf .party-meta { font-size: 9pt; color: #333; }
  .doc-pdf table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .doc-pdf table.line-items thead th {
    background: #1a1a1a; color: #fff; font-size: 8.5pt; text-transform: uppercase;
    padding: 6px 8px; text-align: left; letter-spacing: 0.3px;
  }
  .doc-pdf table.line-items thead th.num { text-align: right; }
  .doc-pdf table.line-items tbody td { padding: 6px 8px; border-bottom: 1px solid #e6e6e6; font-size: 9.5pt; vertical-align: top; }
  .doc-pdf table.line-items tbody td.num { text-align: right; white-space: nowrap; }
  .doc-pdf table.line-items tbody tr:nth-child(even) { background: #fafafa; }
  .doc-pdf .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .doc-pdf table.totals { width: 280px; border-collapse: collapse; }
  .doc-pdf table.totals td { padding: 3px 8px; font-size: 9.5pt; }
  .doc-pdf table.totals td.label { color: #444; }
  .doc-pdf table.totals td.value { text-align: right; font-variant-numeric: tabular-nums; }
  .doc-pdf table.totals tr.grand-total td { border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 11pt; padding-top: 6px; }
  .doc-pdf .amount-words { font-size: 9pt; font-style: italic; color: #333; margin-bottom: 16px; }
  .doc-pdf .bottom-section { display: flex; justify-content: space-between; gap: 24px; margin-top: 24px; }
  .doc-pdf .notes-terms { flex: 1.4; font-size: 8.5pt; color: #333; }
  .doc-pdf .notes-terms h4 { font-size: 8.5pt; text-transform: uppercase; margin: 0 0 4px; color: #666; }
  .doc-pdf .notes-terms p { white-space: pre-wrap; margin: 0 0 10px; }
  .doc-pdf .signature-block { flex: 1; text-align: right; }
  .doc-pdf .bank-details { font-size: 8.5pt; color: #333; margin-bottom: 24px; }
  .doc-pdf .bank-details h4 { font-size: 8.5pt; text-transform: uppercase; margin: 0 0 4px; color: #666; }
  .doc-pdf .signature-img { height: 50px; object-fit: contain; margin-bottom: 4px; }
  .doc-pdf .signature-line { border-top: 1px solid #1a1a1a; padding-top: 4px; font-size: 9pt; }
`;
