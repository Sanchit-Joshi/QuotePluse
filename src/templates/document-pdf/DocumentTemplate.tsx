import { documentPdfStyles } from "./styles";
import type { DocumentPdfData } from "./types";

/**
 * Pure presentational template shared by the PDF service (Playwright print
 * of the live preview route — see ADR-007) and the in-app preview page, so
 * what the user previews is exactly what gets printed (FR-6.1/FR-6.3).
 * Layout matches the client's real reference invoices (plain bordered
 * boxes, centered text, "VENDOR CODE"/bank-details footer) — see
 * docs/decision-log.md ADR-009. React escapes all interpolated text nodes
 * by default, so user-supplied content can never inject markup here — see
 * docs/security.md §XSS.
 */
export function DocumentTemplate({ data }: { data: DocumentPdfData }) {
  const hasCgstSgst = data.cgst !== "₹0.00" || data.sgst !== "₹0.00";
  const hasIgst = data.igst !== "₹0.00";

  return (
    <div className="doc-pdf">
      <style>{documentPdfStyles}</style>

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

      <div className="doc-title">
        {data.documentTypeLabel.toUpperCase()}
        <div className="status-badge">{data.status}</div>
      </div>

      <div className="header-info">
        <div className="col">
          <div className="line">To,</div>
          <div className="line customer-name">{data.customer.name}</div>
          <div className="line" style={{ whiteSpace: "pre-line" }}>
            {data.customer.billingAddress}
          </div>
          {data.customer.gstin ? <div className="line bold">GSTN NO.:- {data.customer.gstin}</div> : null}
        </div>
        <div className="col">
          <div className="line bold">
            {data.documentTypeLabel.toUpperCase()} NO:- {data.number}
          </div>
          <div className="line bold">DATE:- {data.issueDate}</div>
          {data.secondaryDate ? (
            <div className="line bold">
              {data.secondaryDate.label.toUpperCase()}:- {data.secondaryDate.value}
            </div>
          ) : null}
          {data.uniformHsnSac ? <div className="line bold">HSN CODE - {data.uniformHsnSac}</div> : null}
        </div>
      </div>

      <table className="line-items">
        <thead>
          <tr>
            <th style={{ width: "5%" }}>SR.NO</th>
            <th style={{ width: "38%" }}>Product Description</th>
            {!data.uniformHsnSac ? <th style={{ width: "10%" }}>HSN/SAC</th> : null}
            <th style={{ width: "8%" }}>Qty</th>
            <th style={{ width: "14%" }}>Rate Each</th>
            <th style={{ width: "15%" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((li, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className="desc">{li.description}</td>
              {!data.uniformHsnSac ? <td>{li.hsnSac ?? "-"}</td> : null}
              <td className="num">{li.quantity}</td>
              <td className="num">{li.unitPrice}</td>
              <td className="num">{li.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bottom-section">
        <div className="vendor-bank">
          {data.customer.referenceCode ? (
            <div className="line">VENDOR CODE-{data.customer.referenceCode}</div>
          ) : null}
          {data.company.bank ? (
            <>
              <div className="line">Bank Details:-{data.company.bank.bankName}</div>
              <div className="line">
                IFSC CODE:-{data.company.bank.ifsc} &nbsp;&nbsp; BRANCH = {data.company.bank.branch}
              </div>
              <div className="line">BANK ACCOUNT NUMBER:-{data.company.bank.accountNumber}</div>
            </>
          ) : null}
        </div>

        <table className="totals-box">
          <tbody>
            <tr>
              <td className="label">Subtotal</td>
              <td className="value">{data.subtotal}</td>
            </tr>
            {data.discount !== "₹0.00" ? (
              <tr>
                <td className="label">Discount</td>
                <td className="value">- {data.discount}</td>
              </tr>
            ) : null}
            {hasCgstSgst ? (
              <>
                <tr>
                  <td className="label">ADD:-CGST {data.cgstRateLabel}%</td>
                  <td className="value">{data.cgst}</td>
                </tr>
                <tr>
                  <td className="label">ADD:-SGST {data.sgstRateLabel}%</td>
                  <td className="value">{data.sgst}</td>
                </tr>
              </>
            ) : null}
            {hasIgst ? (
              <tr>
                <td className="label">ADD:-IGST {data.igstRateLabel}%</td>
                <td className="value">{data.igst}</td>
              </tr>
            ) : null}
            <tr className="total-row">
              <td className="label">TOTAL Rs.</td>
              <td className="value">{data.grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="amount-words">Amount in words: {data.amountInWords}</p>

      {data.notes || data.terms ? (
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
      ) : null}

      <div className="signature-block">
        {data.company.signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="signature-img" src={data.company.signatureUrl} alt="Authorized signatory" />
        ) : null}
        <div className="signature-line">{data.company.signatoryName ?? "Authorized Signatory"}</div>
      </div>
    </div>
  );
}
