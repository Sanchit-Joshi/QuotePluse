import { Document, Page, View, Text, Image, Font, StyleSheet } from "@react-pdf/renderer";
import { HIND_REGULAR_TTF_BASE64, HIND_BOLD_TTF_BASE64 } from "@/assets/fonts/hind-fonts.generated";
import type { PurchaseOrderPdfData } from "@/templates/purchase-order-pdf/types";

/** Same Hind registration as DocumentPdfDocument (document-pdf-react) — see that file's comment for why. Font.register is idempotent per family name across multiple react-pdf documents in one process. */
Font.register({
  family: "Hind",
  fonts: [
    { src: `data:font/ttf;base64,${HIND_REGULAR_TTF_BASE64}`, fontWeight: 400 },
    { src: `data:font/ttf;base64,${HIND_BOLD_TTF_BASE64}`, fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { fontFamily: "Hind", fontSize: 8.5, color: "#000", padding: "24px 28px" },
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
  docTitle: { textAlign: "center", fontWeight: 700, fontSize: 12, letterSpacing: 1, padding: "4px 0 6px" },

  refDateRow: { flexDirection: "row", marginBottom: 6 },
  refDateCell: { flex: 1, border: "1px solid #000", padding: "3px 6px", fontSize: 9, fontWeight: 700 },

  headerInfo: { border: "1.5px solid #000", padding: "5px 8px", fontSize: 9 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between" },
  vendorName: { fontWeight: 700, fontSize: 10.5 },
  ourGstin: { fontWeight: 700, border: "0.75px solid #000", padding: "1px 6px" },

  instruction: { fontSize: 8.5, fontWeight: 700, textDecoration: "underline", margin: "6px 0 5px" },

  shippingRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  shippingCell: { flex: 1, border: "0.75px solid #000", padding: "3px 6px", fontSize: 8 },
  bold: { fontWeight: 700 },

  table: { border: "1.5px solid #000" },
  tr: { flexDirection: "row" },
  th: { border: "0.75px solid #000", fontWeight: 700, fontSize: 8, padding: "4px 4px", textAlign: "center" },
  td: { border: "0.75px solid #000", fontSize: 8, padding: "3px 4px", textAlign: "center" },
  tdDesc: { textAlign: "left" },
  tdNum: { textAlign: "right" },
  gstRateSub: { fontSize: 6.5, color: "#333" },

  totalRow: { flexDirection: "row", justifyContent: "flex-end", border: "1.5px solid #000", borderTop: "none" },
  totalLabel: { padding: "4px 8px", fontWeight: 700, fontSize: 10, borderRight: "0.75px solid #000" },
  totalValue: { padding: "4px 10px", fontWeight: 700, fontSize: 10, minWidth: 100, textAlign: "right" },

  noteBox: { border: "0.75px solid #000", borderTop: "none", padding: "3px 6px", fontSize: 8 },

  termsBlock: { marginTop: 6, fontSize: 8 },
  termsHeading: { fontSize: 8, fontWeight: 700, textDecoration: "underline", marginBottom: 2 },
  paymentLine: { fontWeight: 700, marginTop: 3 },

  deliveryBox: { border: "0.75px solid #000", padding: "5px 7px", fontSize: 7.5, marginTop: 5, maxWidth: 260 },
  deliveryLabel: { fontWeight: 700, textDecoration: "underline", marginBottom: 2 },

  closingRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24 },
  signatureBlock: { alignItems: "flex-end" },
  signatureFor: { fontSize: 8.5, fontWeight: 700, marginBottom: 4 },
  signatureImg: { height: 40, objectFit: "contain" },
  signatureLine: { borderTop: "0.75px solid #000", paddingTop: 3, marginTop: 26, fontSize: 8.5, fontWeight: 700 },

  footer: { position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 7, color: "#666" },
});

/** react-pdf equivalent of PurchaseOrderTemplate — see that file for the reference layout this is modeled on. Used for the fast Vercel PDF route (see ADR-017 for why react-pdf exists alongside Playwright). */
export function PurchaseOrderPdfDocument({ data }: { data: PurchaseOrderPdfData }) {
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

        <Text style={s.docTitle}>PURCHASE ORDER</Text>

        <View style={s.refDateRow}>
          <Text style={s.refDateCell}>Ref No. / PO No.: {data.number}</Text>
          <Text style={s.refDateCell}>Date: {data.issueDate}</Text>
        </View>

        <View style={s.headerInfo}>
          <View style={s.headerTopRow}>
            <Text>To,</Text>
            {data.vendor.gstin ? <Text style={s.ourGstin}>Vendor GSTN: {data.vendor.gstin}</Text> : null}
          </View>
          <Text style={s.vendorName}>{data.vendor.name}</Text>
          <Text>{data.vendor.address}</Text>
          <Text>{data.vendor.state}</Text>
        </View>

        <Text style={s.instruction}>
          Please arrange to supply the following materials in accordance with terms and conditions as
          follows:
        </Text>

        <View style={s.shippingRow}>
          <Text style={s.shippingCell}>
            <Text style={s.bold}>Shipping By: </Text>
            {data.shippingBy ?? "-"}
          </Text>
          <Text style={s.shippingCell}>
            <Text style={s.bold}>Shipping Terms: </Text>
            {data.shippingTerms ?? "-"}
          </Text>
          <Text style={s.shippingCell}>
            <Text style={s.bold}>Delivery Date: </Text>
            {data.deliveryDate ?? "-"}
          </Text>
        </View>

        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { width: "4%" }]}>SR.NO</Text>
            <Text style={[s.th, s.tdDesc, { width: "26%" }]}>Product Description</Text>
            {!data.uniformHsnSac ? <Text style={[s.th, { width: "8%" }]}>HSN/SAC</Text> : null}
            <Text style={[s.th, { width: "6%" }]}>Qty</Text>
            <Text style={[s.th, { width: "13%" }]}>Basic Price</Text>
            <Text style={[s.th, { width: "9%" }]}>Discount</Text>
            <Text style={[s.th, { width: "13%" }]}>Net Basic</Text>
            <Text style={[s.th, { width: "12%" }]}>GST</Text>
            <Text style={[s.th, { width: "13%" }]}>Total</Text>
          </View>
          {data.lineItems.map((li, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: "4%" }]}>{i + 1}</Text>
              <Text style={[s.td, s.tdDesc, { width: "26%" }]}>{li.description}</Text>
              {!data.uniformHsnSac ? <Text style={[s.td, { width: "8%" }]}>{li.hsnSac ?? "-"}</Text> : null}
              <Text style={[s.td, s.tdNum, { width: "6%" }]}>{li.quantity}</Text>
              <Text style={[s.td, s.tdNum, { width: "13%" }]}>{li.basicPrice}</Text>
              <Text style={[s.td, s.tdNum, { width: "9%" }]}>{li.discountPct}</Text>
              <Text style={[s.td, s.tdNum, { width: "13%" }]}>{li.netBasic}</Text>
              <View style={[s.td, { width: "12%", alignItems: "flex-end" }]}>
                <Text>{li.gstAmount}</Text>
                <Text style={s.gstRateSub}>({li.gstRateLabel}%)</Text>
              </View>
              <Text style={[s.td, s.tdNum, { width: "13%" }]}>{li.total}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total Amount</Text>
          <Text style={s.totalValue}>{data.totalAmount}</Text>
        </View>

        {data.uniformHsnSac ? (
          <Text style={s.noteBox}>
            <Text style={s.bold}>HSN/SAC: </Text>
            {data.uniformHsnSac}
          </Text>
        ) : null}

        <Text style={s.noteBox}>
          <Text style={s.bold}>NOTE:- </Text>
          {data.notes ?? ""}
        </Text>

        <View style={s.termsBlock}>
          {data.terms ? (
            <>
              <Text style={s.termsHeading}>Terms &amp; Conditions</Text>
              <Text>{data.terms}</Text>
            </>
          ) : null}
          {data.paymentTerms ? <Text style={s.paymentLine}>Payment: {data.paymentTerms}</Text> : null}
        </View>

        {data.deliveryAddress ? (
          <View style={s.deliveryBox}>
            <Text style={s.deliveryLabel}>Delivery Address:</Text>
            <Text>{data.deliveryAddress}</Text>
          </View>
        ) : null}

        <View style={s.closingRow}>
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
