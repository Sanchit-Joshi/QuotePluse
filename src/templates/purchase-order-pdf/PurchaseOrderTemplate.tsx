import { purchaseOrderPdfStyles } from "./styles";
import type { PurchaseOrderPdfData } from "./types";

/**
 * Purchase Order layout modeled on the client's real reference PO (plain
 * bordered boxes, "Ref No./PO No." + Date fields, vendor "To," block, "Our
 * GSTN No" field, shipping/delivery row, per-line GST column, single "Total
 * Amount" — no CGST/SGST breakdown box like quotations/invoices have).
 * Shared by the Playwright print route and the in-app preview page, so what
 * the user previews is exactly what gets printed (same pattern as
 * DocumentTemplate — see docs/decision-log.md ADR-007). React escapes all
 * interpolated text nodes by default (see docs/security.md §XSS).
 */
export function PurchaseOrderTemplate({ data }: { data: PurchaseOrderPdfData }) {
  return (
    <div className="po-pdf">
      <style>{purchaseOrderPdfStyles}</style>

      <div className="company-block">
        {data.company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static template rendered outside Next's image pipeline
          <img className="logo" src={data.company.logoUrl} alt={`${data.company.name} logo`} />
        ) : (
          <div>
            <p className="company-name">{data.company.name}</p>
            <div className="company-address">
              <div>{data.company.addressLine1}</div>
              {data.company.addressLine2 ? <div>{data.company.addressLine2}</div> : null}
              <div>{data.company.state}</div>
            </div>
          </div>
        )}
      </div>

      {data.company.gstin ? <div className="gstin-line">GSTN NO.:- {data.company.gstin}</div> : null}

      <div className="doc-title">PURCHASE ORDER</div>

      <div className="ref-date-row">
        <div className="ref-date-cell">Ref No. / PO No.: {data.number}</div>
        <div className="ref-date-cell">Date: {data.issueDate}</div>
      </div>

      <div className="header-info">
        <div className="header-top-row">
          <div>To,</div>
          {data.vendor.gstin ? <div className="our-gstin">Vendor GSTN: {data.vendor.gstin}</div> : null}
        </div>
        <div className="vendor-name">{data.vendor.name}</div>
        <div style={{ whiteSpace: "pre-line" }}>{data.vendor.address}</div>
        <div>{data.vendor.state}</div>
      </div>

      <p className="instruction">
        Please arrange to supply the following materials in accordance with terms and conditions as follows:
      </p>

      <div className="shipping-row">
        <div className="shipping-cell">
          <span className="label">Shipping By:</span> {data.shippingBy ?? "-"}
        </div>
        <div className="shipping-cell">
          <span className="label">Shipping Terms:</span> {data.shippingTerms ?? "-"}
        </div>
        <div className="shipping-cell">
          <span className="label">Delivery Date:</span> {data.deliveryDate ?? "-"}
        </div>
      </div>

      <table className="line-items">
        <thead>
          <tr>
            <th style={{ width: "4%" }}>SR.NO</th>
            <th style={{ width: "26%" }}>Product Description</th>
            {!data.uniformHsnSac ? <th style={{ width: "8%" }}>HSN/SAC</th> : null}
            <th style={{ width: "6%" }}>Qty</th>
            <th style={{ width: "13%" }}>Basic Price</th>
            <th style={{ width: "9%" }}>Discount</th>
            <th style={{ width: "13%" }}>Net Basic</th>
            <th style={{ width: "12%" }}>GST</th>
            <th style={{ width: "13%" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((li, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className="desc">{li.description}</td>
              {!data.uniformHsnSac ? <td>{li.hsnSac ?? "-"}</td> : null}
              <td className="num">{li.quantity}</td>
              <td className="num">{li.basicPrice}</td>
              <td className="num">{li.discountPct}</td>
              <td className="num">{li.netBasic}</td>
              <td className="num">
                <div>{li.gstAmount}</div>
                <div className="gst-rate-sub">({li.gstRateLabel}%)</div>
              </td>
              <td className="num">{li.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="total-row">
        <div className="label">Total Amount</div>
        <div className="value">{data.totalAmount}</div>
      </div>

      {data.uniformHsnSac ? (
        <div className="note-box">
          <span className="label">HSN/SAC:</span> {data.uniformHsnSac}
        </div>
      ) : null}

      <div className="note-box">
        <span className="label">NOTE:-</span> {data.notes ?? ""}
      </div>

      <div className="terms-block">
        {data.terms ? (
          <>
            <h4>Terms &amp; Conditions</h4>
            <p>{data.terms}</p>
          </>
        ) : null}
        {data.paymentTerms ? <p className="payment-line">Payment: {data.paymentTerms}</p> : null}
      </div>

      {data.deliveryAddress ? (
        <div className="delivery-address-box">
          <span className="label">Delivery Address:</span>
          <div style={{ whiteSpace: "pre-line" }}>{data.deliveryAddress}</div>
        </div>
      ) : null}

      <div className="closing-row">
        <div className="signature-block">
          <div className="signature-for">For - {data.company.name}</div>
          {data.company.signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="signature-img" src={data.company.signatureUrl} alt="Authorized signatory" />
          ) : null}
          <div className="signature-line">{data.company.signatoryName ?? "Authorized Signatory"}</div>
        </div>
      </div>
    </div>
  );
}
