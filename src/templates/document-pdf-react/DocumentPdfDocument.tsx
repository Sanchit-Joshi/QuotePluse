import { Document, Page, View, Text, Image, Font, StyleSheet } from "@react-pdf/renderer";
import { HIND_REGULAR_TTF_BASE64, HIND_BOLD_TTF_BASE64 } from "@/assets/fonts/hind-fonts.generated";
import type { DocumentPdfData } from "@/templates/document-pdf/types";

/**
 * Hind is registered from embedded base64 (not a file path) so the font
 * ships inside the route's JS bundle with no separate asset-tracing rule
 * to get wrong — see src/assets/fonts/hind-fonts.generated.ts for why.
 * Standard 14 PDF fonts (Helvetica etc, react-pdf's default) have no glyph
 * for the Rupee sign (₹, U+20B9) used throughout formatPaiseAsCurrency().
 */
Font.register({
  family: "Hind",
  fonts: [
    { src: `data:font/ttf;base64,${HIND_REGULAR_TTF_BASE64}`, fontWeight: 400 },
    { src: `data:font/ttf;base64,${HIND_BOLD_TTF_BASE64}`, fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: {
    fontFamily: "Hind",
    fontSize: 9.5,
    color: "#000",
    padding: "24px 28px",
  },
  companyBlock: {
    border: "1.5px solid #000",
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  logo: { maxHeight: 55, objectFit: "contain" },
  companyName: { fontSize: 15, fontWeight: 700, textAlign: "center" },
  companyAddress: { fontSize: 8.5, textAlign: "center", marginTop: 2 },
  gstinLine: { textAlign: "center", fontWeight: 700, fontSize: 9.5, padding: "4px 0" },
  docTitle: {
    textAlign: "center",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 1,
    padding: "4px 0 6px",
  },
  statusBadge: {
    alignSelf: "center",
    marginTop: 4,
    padding: "1px 8px",
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    border: "1px solid #000",
  },
  headerInfo: { flexDirection: "row", border: "1.5px solid #000" },
  headerCol: { flex: 1, padding: "6px 8px", fontSize: 9 },
  headerColBorder: { borderLeft: "1.5px solid #000" },
  line: { paddingVertical: 1 },
  bold: { fontWeight: 700 },
  customerName: { fontWeight: 700, fontSize: 9.5 },

  table: { border: "1.5px solid #000", borderTop: "none" },
  tr: { flexDirection: "row" },
  th: {
    border: "0.75px solid #000",
    fontWeight: 700,
    fontSize: 9,
    padding: "4px 5px",
    textAlign: "center",
  },
  td: {
    border: "0.75px solid #000",
    fontSize: 9,
    padding: "3px 5px",
    textAlign: "center",
  },
  tdDesc: { textAlign: "left" },
  tdNum: { textAlign: "right" },

  bottomSection: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 8 },
  vendorBank: { fontSize: 8.5, flex: 1.2 },
  vendorLine: { paddingVertical: 1, fontWeight: 700 },

  totalsBox: { width: 220, border: "1.5px solid #000" },
  totalsRow: { flexDirection: "row" },
  totalsLabel: {
    flex: 1,
    border: "0.75px solid #000",
    padding: "3px 6px",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "left",
  },
  totalsValue: {
    flex: 1,
    border: "0.75px solid #000",
    padding: "3px 6px",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "right",
  },
  totalsRowFinal: { fontSize: 10 },

  amountWords: { fontSize: 8.5, fontWeight: 700, marginTop: 8 },

  closingRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 8 },
  notesTerms: { fontSize: 8, flex: 1.4 },
  notesHeading: { fontSize: 8, textTransform: "uppercase", marginTop: 4, marginBottom: 1, fontWeight: 700 },

  signatureBlock: { flex: 1, alignItems: "flex-end" },
  signatureFor: { fontSize: 8.5, fontWeight: 700, marginBottom: 4 },
  signatureImg: { height: 40, objectFit: "contain" },
  signatureLine: { borderTop: "0.75px solid #000", paddingTop: 3, marginTop: 26, fontSize: 8.5, fontWeight: 700 },

  footer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    color: "#666",
  },
});

/**
 * @react-pdf/renderer equivalent of DocumentTemplate (src/templates/document-pdf),
 * used only for the Vercel-serverless PDF route while the browser-print
 * (Playwright) route is parked — see docs/decision-log.md. Consumes the same
 * framework-agnostic DocumentPdfData as the Playwright path so both engines
 * stay data-compatible; this is a hand-rebuilt layout (react-pdf has no HTML/
 * CSS renderer), not a literal 1:1 pixel match with the browser template.
 */
export function DocumentPdfDocument({ data }: { data: DocumentPdfData }) {
  const hasCgstSgst = data.cgst !== "₹0.00" || data.sgst !== "₹0.00";
  const hasIgst = data.igst !== "₹0.00";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.companyBlock}>
          {data.company.logoUrl ? (
            <Image style={s.logo} src={data.company.logoUrl} />
          ) : (
            <View>
              <Text style={s.companyName}>{data.company.name}</Text>
              <View style={s.companyAddress}>
                <Text>{data.company.addressLine1}</Text>
                {data.company.addressLine2 ? <Text>{data.company.addressLine2}</Text> : null}
                <Text>{data.company.state}</Text>
              </View>
            </View>
          )}
        </View>

        {data.company.gstin ? <Text style={s.gstinLine}>GSTN NO.:- {data.company.gstin}</Text> : null}

        <View style={s.docTitle}>
          <Text>{data.documentTypeLabel.toUpperCase()}</Text>
          <Text style={s.statusBadge}>{data.status}</Text>
        </View>

        <View style={s.headerInfo}>
          <View style={s.headerCol}>
            <Text style={s.line}>To,</Text>
            <Text style={[s.line, s.customerName]}>{data.customer.name}</Text>
            <Text style={s.line}>{data.customer.billingAddress}</Text>
            {data.customer.gstin ? (
              <Text style={[s.line, s.bold]}>GSTN NO.:- {data.customer.gstin}</Text>
            ) : null}
          </View>
          <View style={[s.headerCol, s.headerColBorder]}>
            <Text style={[s.line, s.bold]}>
              {data.documentTypeLabel.toUpperCase()} NO:- {data.number}
            </Text>
            <Text style={[s.line, s.bold]}>DATE:- {data.issueDate}</Text>
            {data.secondaryDate ? (
              <Text style={[s.line, s.bold]}>
                {data.secondaryDate.label.toUpperCase()}:- {data.secondaryDate.value}
              </Text>
            ) : null}
            {data.uniformHsnSac ? <Text style={[s.line, s.bold]}>HSN CODE - {data.uniformHsnSac}</Text> : null}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { width: "5%" }]}>SR.NO</Text>
            <Text style={[s.th, s.tdDesc, { width: "38%" }]}>Product Description</Text>
            {!data.uniformHsnSac ? <Text style={[s.th, { width: "10%" }]}>HSN/SAC</Text> : null}
            <Text style={[s.th, { width: "8%" }]}>Qty</Text>
            <Text style={[s.th, { width: "14%" }]}>Rate Each</Text>
            <Text style={[s.th, { width: "15%" }]}>Amount</Text>
          </View>
          {data.lineItems.map((li, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: "5%" }]}>{i + 1}</Text>
              <Text style={[s.td, s.tdDesc, { width: "38%" }]}>{li.description}</Text>
              {!data.uniformHsnSac ? <Text style={[s.td, { width: "10%" }]}>{li.hsnSac ?? "-"}</Text> : null}
              <Text style={[s.td, s.tdNum, { width: "8%" }]}>{li.quantity}</Text>
              <Text style={[s.td, s.tdNum, { width: "14%" }]}>{li.unitPrice}</Text>
              <Text style={[s.td, s.tdNum, { width: "15%" }]}>{li.lineTotal}</Text>
            </View>
          ))}
        </View>

        <View style={s.bottomSection}>
          <View style={s.vendorBank}>
            {data.customer.referenceCode ? (
              <Text style={s.vendorLine}>VENDOR CODE-{data.customer.referenceCode}</Text>
            ) : null}
            {data.company.bank ? (
              <>
                <Text style={s.vendorLine}>Bank Details:-{data.company.bank.bankName}</Text>
                <Text style={s.vendorLine}>
                  IFSC CODE:-{data.company.bank.ifsc}   BRANCH = {data.company.bank.branch}
                </Text>
                <Text style={s.vendorLine}>BANK ACCOUNT NUMBER:-{data.company.bank.accountNumber}</Text>
              </>
            ) : null}
          </View>

          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{data.subtotal}</Text>
            </View>
            {data.discount !== "₹0.00" ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Discount</Text>
                <Text style={s.totalsValue}>- {data.discount}</Text>
              </View>
            ) : null}
            {hasCgstSgst ? (
              <>
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>ADD:-CGST {data.cgstRateLabel}%</Text>
                  <Text style={s.totalsValue}>{data.cgst}</Text>
                </View>
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>ADD:-SGST {data.sgstRateLabel}%</Text>
                  <Text style={s.totalsValue}>{data.sgst}</Text>
                </View>
              </>
            ) : null}
            {hasIgst ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>ADD:-IGST {data.igstRateLabel}%</Text>
                <Text style={s.totalsValue}>{data.igst}</Text>
              </View>
            ) : null}
            <View style={s.totalsRow}>
              <Text style={[s.totalsLabel, s.totalsRowFinal]}>TOTAL Rs.</Text>
              <Text style={[s.totalsValue, s.totalsRowFinal]}>{data.grandTotal}</Text>
            </View>
          </View>
        </View>

        <Text style={s.amountWords}>Amount in words: {data.amountInWords}</Text>

        <View style={s.closingRow}>
          <View style={s.notesTerms}>
            {data.notes ? (
              <>
                <Text style={s.notesHeading}>Notes</Text>
                <Text>{data.notes}</Text>
              </>
            ) : null}
            {data.terms ? (
              <>
                <Text style={s.notesHeading}>Terms &amp; Conditions</Text>
                <Text>{data.terms}</Text>
              </>
            ) : null}
          </View>

          <View style={s.signatureBlock}>
            <Text style={s.signatureFor}>For - {data.company.name}</Text>
            {data.company.signatureUrl ? <Image style={s.signatureImg} src={data.company.signatureUrl} /> : null}
            <Text style={s.signatureLine}>{data.company.signatoryName ?? "Authorized Signatory"}</Text>
          </View>
        </View>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
