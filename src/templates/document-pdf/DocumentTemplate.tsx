import { documentPdfStyles } from "./styles";
import type { DocumentPdfData } from "./types";

/**
 * Pure presentational template shared by the PDF service (renderToStaticMarkup
 * + Playwright print) and the in-app preview page, so what the user previews
 * is exactly what gets printed (FR-6.1/FR-6.3). React escapes all interpolated
 * text nodes by default, so user-supplied content (customer name, notes,
 * terms, etc.) can never inject markup here — see docs/security.md §XSS.
 */
export function DocumentTemplate({ data }: { data: DocumentPdfData }) {
  return (
    <div className="doc-pdf">
      <style>{documentPdfStyles}</style>

      <div className="header">
        <div className="company-block">
          {data.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- static template rendered outside Next's image pipeline (Playwright print + raw preview)
            <img className="logo" src={data.company.logoUrl} alt={`${data.company.name} logo`} />
          ) : null}
          <div>
            <p className="company-name">{data.company.name}</p>
            <div className="company-meta">
              <div>{data.company.addressLine1}</div>
              {data.company.addressLine2 ? <div>{data.company.addressLine2}</div> : null}
              <div>{data.company.state}</div>
              {data.company.gstin ? <div>GSTIN: {data.company.gstin}</div> : null}
            </div>
          </div>
        </div>
        <div className="doc-title-block">
          <p className="doc-title">{data.documentTypeLabel}</p>
          <div className="doc-number">{data.number}</div>
          <div className="doc-dates">
            <div>Date: {data.issueDate}</div>
            {data.secondaryDate ? (
              <div>
                {data.secondaryDate.label}: {data.secondaryDate.value}
              </div>
            ) : null}
          </div>
          <span className="status-badge">{data.status}</span>
        </div>
      </div>

      <div className="parties">
        <div className="party-box">
          <div className="party-label">Bill To</div>
          <div className="party-name">{data.customer.name}</div>
          <div className="party-meta">
            <div>{data.customer.billingAddress}</div>
            <div>{data.customer.state}</div>
            {data.customer.gstin ? <div>GSTIN: {data.customer.gstin}</div> : null}
            {data.customer.phone ? <div>Phone: {data.customer.phone}</div> : null}
            {data.customer.email ? <div>Email: {data.customer.email}</div> : null}
          </div>
        </div>
        {data.customer.shippingAddress ? (
          <div className="party-box">
            <div className="party-label">Ship To</div>
            <div className="party-meta">{data.customer.shippingAddress}</div>
          </div>
        ) : null}
      </div>

      <table className="line-items">
        <thead>
          <tr>
            <th style={{ width: "4%" }}>#</th>
            <th style={{ width: "30%" }}>Description</th>
            <th>HSN/SAC</th>
            <th className="num">Qty</th>
            <th className="num">Unit Price</th>
            <th className="num">Disc %</th>
            <th className="num">GST %</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((li, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{li.description}</td>
              <td>{li.hsnSac ?? "-"}</td>
              <td className="num">
                {li.quantity} {li.unit}
              </td>
              <td className="num">{li.unitPrice}</td>
              <td className="num">{li.discountPct}</td>
              <td className="num">{li.gstRate}</td>
              <td className="num">{li.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals-wrap">
        <table className="totals">
          <tbody>
            <tr>
              <td className="label">Subtotal</td>
              <td className="value">{data.subtotal}</td>
            </tr>
            <tr>
              <td className="label">Discount</td>
              <td className="value">- {data.discount}</td>
            </tr>
            <tr>
              <td className="label">Taxable Value</td>
              <td className="value">{data.taxableValue}</td>
            </tr>
            {data.cgst !== "0.00" && data.cgst !== "₹0.00" ? (
              <tr>
                <td className="label">CGST</td>
                <td className="value">{data.cgst}</td>
              </tr>
            ) : null}
            {data.sgst !== "0.00" && data.sgst !== "₹0.00" ? (
              <tr>
                <td className="label">SGST</td>
                <td className="value">{data.sgst}</td>
              </tr>
            ) : null}
            {data.igst !== "0.00" && data.igst !== "₹0.00" ? (
              <tr>
                <td className="label">IGST</td>
                <td className="value">{data.igst}</td>
              </tr>
            ) : null}
            <tr>
              <td className="label">Rounding</td>
              <td className="value">{data.rounding}</td>
            </tr>
            <tr className="grand-total">
              <td className="label">Grand Total</td>
              <td className="value">{data.grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="amount-words">Amount in words: {data.amountInWords}</p>

      {data.company.bank ? (
        <div className="bank-details">
          <h4>Bank Details</h4>
          <div>
            {data.company.bank.bankName}, {data.company.bank.branch}
          </div>
          <div>A/C Name: {data.company.bank.accountName}</div>
          <div>A/C No: {data.company.bank.accountNumber}</div>
          <div>IFSC: {data.company.bank.ifsc}</div>
        </div>
      ) : null}

      <div className="bottom-section">
        <div className="notes-terms">
          {data.notes ? (
            <>
              <h4>Notes</h4>
              <p>{data.notes}</p>
            </>
          ) : null}
          {data.terms ? (
            <>
              <h4>Terms &amp; Conditions</h4>
              <p>{data.terms}</p>
            </>
          ) : null}
        </div>
        <div className="signature-block">
          {data.company.signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="signature-img" src={data.company.signatureUrl} alt="Authorized signatory" />
          ) : (
            <div style={{ height: 50 }} />
          )}
          <div className="signature-line">
            {data.company.signatoryName ?? "Authorized Signatory"}
          </div>
        </div>
      </div>
    </div>
  );
}
