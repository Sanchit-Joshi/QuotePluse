/**
 * Hand-written CSS for the Purchase Order PDF/preview template — same
 * approach as templates/document-pdf/styles.ts (deliberately not Tailwind,
 * must render identically with or without the app's compiled stylesheet).
 * Layout follows the client's real reference PO (plain white background,
 * black text, bordered boxes, Calibri) but is a fresh layout, not a reuse
 * of the quotation/invoice template — the field set genuinely differs
 * (vendor/shipping/delivery instead of customer/tax-breakdown).
 */
export const purchaseOrderPdfStyles = `
  @page { size: A4; margin: 0; }
  .po-pdf {
    font-family: Calibri, Arial, "Helvetica Neue", sans-serif;
    color: #000;
    font-size: 10.5pt;
    line-height: 1.35;
    width: 100%;
    box-sizing: border-box;
    padding: 10px 14px;
    background: #fff;
  }
  .po-pdf * { box-sizing: border-box; }
  .po-pdf table { border-collapse: collapse; width: 100%; }

  .po-pdf .company-block {
    border: 2px solid #000;
    min-height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8px;
  }
  .po-pdf .company-block .logo { max-height: 70px; max-width: 100%; object-fit: contain; }
  .po-pdf .company-name { font-size: 16pt; font-weight: 700; margin: 0; }
  .po-pdf .company-address { font-size: 9.5pt; margin-top: 2px; }

  .po-pdf .gstin-line {
    text-align: center;
    font-weight: 700;
    font-size: 11pt;
    padding: 4px 0;
  }

  .po-pdf .doc-title {
    text-align: center;
    font-weight: 700;
    font-size: 13pt;
    letter-spacing: 1px;
    padding: 4px 0 8px;
  }

  .po-pdf .ref-date-row { display: flex; gap: 0; margin-bottom: 6px; }
  .po-pdf .ref-date-cell {
    flex: 1;
    border: 1.5px solid #000;
    padding: 4px 8px;
    font-size: 10pt;
    font-weight: 700;
  }
  .po-pdf .ref-date-cell + .ref-date-cell { border-left: none; }

  .po-pdf .header-info { border: 2px solid #000; padding: 6px 10px; font-size: 10.5pt; }
  .po-pdf .header-top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .po-pdf .vendor-name { font-weight: 700; font-size: 11.5pt; }
  .po-pdf .our-gstin { font-weight: 700; border: 1px solid #000; padding: 2px 8px; white-space: nowrap; }

  .po-pdf .instruction {
    font-size: 10pt;
    font-weight: 700;
    text-decoration: underline;
    margin: 8px 0 6px;
  }

  .po-pdf .shipping-row { display: flex; gap: 8px; margin-bottom: 6px; }
  .po-pdf .shipping-cell {
    flex: 1;
    border: 1px solid #000;
    padding: 4px 8px;
    font-size: 9.5pt;
  }
  .po-pdf .shipping-cell .label { font-weight: 700; }

  .po-pdf table.line-items { border: 2px solid #000; }
  .po-pdf table.line-items thead { display: table-header-group; }
  .po-pdf table.line-items tr { break-inside: avoid; }
  .po-pdf table.line-items th {
    border: 1px solid #000;
    font-weight: 700;
    font-size: 9.5pt;
    padding: 5px 6px;
    text-align: center;
  }
  .po-pdf table.line-items td {
    border: 1px solid #000;
    font-size: 9.5pt;
    padding: 4px 6px;
    text-align: center;
    vertical-align: top;
  }
  .po-pdf table.line-items td.desc { text-align: left; }
  .po-pdf table.line-items td.num { text-align: right; white-space: nowrap; }
  .po-pdf table.line-items .gst-rate-sub { font-size: 7.5pt; color: #333; white-space: nowrap; }

  .po-pdf .total-row {
    display: flex;
    justify-content: flex-end;
    border: 2px solid #000;
    border-top: none;
  }
  .po-pdf .total-row .label {
    padding: 5px 10px;
    font-weight: 700;
    font-size: 11pt;
    border-right: 1px solid #000;
  }
  .po-pdf .total-row .value {
    padding: 5px 14px;
    font-weight: 700;
    font-size: 11pt;
    min-width: 140px;
    text-align: right;
  }

  .po-pdf .note-box {
    border: 1px solid #000;
    border-top: none;
    padding: 4px 8px;
    font-size: 9.5pt;
    min-height: 24px;
  }
  .po-pdf .note-box .label { font-weight: 700; }

  .po-pdf .terms-block { margin-top: 8px; font-size: 9.5pt; }
  .po-pdf .terms-block h4 { font-size: 9.5pt; font-weight: 700; margin: 0 0 2px; text-decoration: underline; }
  .po-pdf .terms-block p { white-space: pre-wrap; margin: 0 0 4px; }
  .po-pdf .payment-line { font-weight: 700; margin-top: 4px; }

  .po-pdf .delivery-address-box {
    border: 1px solid #000;
    padding: 6px 8px;
    font-size: 9pt;
    margin-top: 6px;
    max-width: 320px;
  }
  .po-pdf .delivery-address-box .label { font-weight: 700; text-decoration: underline; display: block; margin-bottom: 2px; }

  .po-pdf .closing-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
  }
  .po-pdf .signature-block { text-align: right; }
  .po-pdf .signature-for { font-size: 10pt; font-weight: 700; margin-bottom: 4px; }
  .po-pdf .signature-img { height: 46px; object-fit: contain; }
  .po-pdf .signature-line { border-top: 1px solid #000; display: inline-block; padding-top: 4px; font-size: 10pt; font-weight: 700; margin-top: 30px; }
`;
