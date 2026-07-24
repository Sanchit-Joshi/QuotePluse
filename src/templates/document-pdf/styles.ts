/**
 * Hand-written, self-contained CSS for the PDF/preview template. Deliberately
 * NOT Tailwind: this layout must stay pixel-fixed across app rebuilds and
 * render identically whether the browser has the app's compiled stylesheet
 * loaded or not (Playwright's page.setContent has no access to it) — see
 * docs/architecture.md §PDF generation.
 *
 * Visually modeled on the client's real reference invoices (plain white
 * background, black text, medium black borders throughout, Calibri,
 * everything center-aligned) rather than the earlier dark-header-row
 * placeholder design — see docs/decision-log.md ADR-009.
 */
export const documentPdfStyles = `
  @page { size: A4; margin: 0; }
  .doc-pdf {
    font-family: Calibri, Arial, "Helvetica Neue", sans-serif;
    color: #000;
    font-size: 11pt;
    line-height: 1.35;
    width: 100%;
    box-sizing: border-box;
    padding: 10px 14px;
    background: #fff;
  }
  .doc-pdf * { box-sizing: border-box; }
  .doc-pdf table { border-collapse: collapse; width: 100%; }
  .doc-pdf .box { border: 2px solid #000; }

  .doc-pdf .company-block {
    border: 2px solid #000;
    min-height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8px;
  }
  .doc-pdf .company-block .logo { max-height: 70px; max-width: 100%; object-fit: contain; }
  .doc-pdf .company-name { font-size: 16pt; font-weight: 700; margin: 0; }
  .doc-pdf .company-address { font-size: 9.5pt; margin-top: 2px; }

  .doc-pdf .gstin-line {
    text-align: center;
    font-weight: 700;
    font-size: 11pt;
    padding: 4px 0;
  }

  .doc-pdf .doc-title {
    text-align: center;
    font-weight: 700;
    font-size: 13pt;
    letter-spacing: 1px;
    padding: 4px 0 8px;
  }

  .doc-pdf .header-info {
    display: flex;
    border: 2px solid #000;
    margin-bottom: 0;
  }
  .doc-pdf .header-info .col { flex: 1; padding: 6px 10px; font-size: 10.5pt; }
  .doc-pdf .header-info .col + .col { border-left: 2px solid #000; }
  .doc-pdf .header-info .line { padding: 1px 0; }
  .doc-pdf .header-info .bold { font-weight: 700; }
  .doc-pdf .header-info .customer-name { font-weight: 700; font-size: 11.5pt; }

  .doc-pdf table.line-items { border: 2px solid #000; border-top: none; }
  .doc-pdf table.line-items thead { display: table-header-group; }
  .doc-pdf table.line-items tr { break-inside: avoid; }
  .doc-pdf table.line-items th {
    border: 1px solid #000;
    font-weight: 700;
    font-size: 10.5pt;
    padding: 5px 6px;
    text-align: center;
  }
  .doc-pdf table.line-items td {
    border: 1px solid #000;
    font-size: 10.5pt;
    padding: 4px 6px;
    text-align: center;
    vertical-align: top;
  }
  .doc-pdf table.line-items td.desc { text-align: left; }
  .doc-pdf table.line-items td.num { text-align: right; white-space: nowrap; }

  .doc-pdf .bottom-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-top: 10px;
  }
  .doc-pdf .vendor-bank { font-size: 10pt; flex: 1.2; }
  .doc-pdf .vendor-bank .line { padding: 1px 0; font-weight: 700; }

  .doc-pdf table.totals-box { width: 260px; border: 2px solid #000; }
  .doc-pdf table.totals-box td {
    border: 1px solid #000;
    padding: 4px 8px;
    font-size: 10.5pt;
    font-weight: 700;
  }
  .doc-pdf table.totals-box td.label { text-align: left; }
  .doc-pdf table.totals-box td.value { text-align: right; white-space: nowrap; }
  .doc-pdf table.totals-box tr.total-row td { font-size: 11.5pt; }

  .doc-pdf .amount-words {
    font-size: 10pt;
    font-weight: 700;
    margin-top: 10px;
  }

  .doc-pdf .closing-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-top: 10px;
  }
  .doc-pdf .notes-terms { font-size: 9pt; flex: 1.4; }
  .doc-pdf .notes-terms h4 { font-size: 9pt; text-transform: uppercase; margin: 6px 0 2px; }
  .doc-pdf .notes-terms p { white-space: pre-wrap; margin: 0; }

  .doc-pdf .signature-block { text-align: right; flex: 1; }
  .doc-pdf .signature-for { font-size: 10pt; font-weight: 700; margin-bottom: 4px; }
  .doc-pdf .signature-img { height: 46px; object-fit: contain; }
  .doc-pdf .signature-line { border-top: 1px solid #000; display: inline-block; padding-top: 4px; font-size: 10pt; font-weight: 700; margin-top: 30px; }

  .doc-pdf .status-badge {
    display: inline-block; margin-top: 4px; padding: 1px 8px;
    font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    border: 1px solid #000;
  }
`;
