import { test, expect, request } from "@playwright/test";

/**
 * End-to-end golden path (FR-3, FR-6): create a customer, create a
 * quotation with a line item, save it as a draft, finalize it (allocating
 * a number), and confirm the PDF endpoint returns a real PDF. Exercises the
 * full stack (UI -> API -> Prisma -> Postgres -> Playwright PDF render)
 * that unit/integration tests intentionally don't cover.
 */

let customerId: string;
let customerName: string;

test.beforeAll(async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  customerName = `E2E Customer ${Date.now()}`;
  const res = await api.post("/api/customers", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
    data: {
      name: customerName,
      billingAddress: "1 E2E Street",
      state: "Maharashtra",
    },
  });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  customerId = body.id;
  await api.dispose();
});

test.afterAll(async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  await api.delete(`/api/customers/${customerId}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  await api.dispose();
});

test("creates, finalizes, and generates a PDF for a quotation", async ({ page }) => {
  await page.goto("/quotations/new");

  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: customerName }).click();

  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByLabel("Description").fill("E2E consulting services");
  await page.getByLabel("Quantity").fill("2");
  await page.getByLabel("Unit price").fill("5000");
  await page.getByLabel("GST rate").fill("18");

  await expect(page.getByText("₹11,800.00")).toBeVisible();

  await page.getByRole("button", { name: "Save & send" }).click();

  await expect(page.getByText(/^QTN-\d{4}-\d{4}$/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("SENT", { exact: true })).toBeVisible();

  const url = page.url();
  const quotationId = url.split("/quotations/")[1];
  expect(quotationId).toBeTruthy();

  const pdfResponse = await page.request.get(`/api/quotations/${quotationId}/pdf`);
  expect(pdfResponse.ok()).toBe(true);
  expect(pdfResponse.headers()["content-type"]).toBe("application/pdf");
  const buffer = await pdfResponse.body();
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");

  // cleanup: cancel is not required for a SENT quotation left in test data,
  // but we at least verify the preview route renders without error.
  await page.goto(`/quotations/${quotationId}/preview`);
  await expect(page.getByText(customerName)).toBeVisible();
});
