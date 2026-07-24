"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { companyInputSchema, type CompanyInput } from "@/validators/company.schema";
import { useCompanyProfile, useUpdateCompanyProfile, uploadFile } from "@/features/settings/hooks/use-settings";
import { ApiError } from "@/lib/api-client";

export function CompanySettingsForm() {
  const { data: company, isLoading } = useCompanyProfile();
  const updateMutation = useUpdateCompanyProfile();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CompanyInput>({
    resolver: zodResolver(companyInputSchema),
    defaultValues: {
      name: "",
      gstin: "",
      addressLine1: "",
      addressLine2: "",
      state: "",
      signatoryName: "",
      bankDetail: { accountName: "", accountNumber: "", ifsc: "", bankName: "", branch: "" },
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        gstin: company.gstin ?? "",
        addressLine1: company.addressLine1,
        addressLine2: company.addressLine2 ?? "",
        state: company.state,
        signatoryName: company.signatoryName ?? "",
        bankDetail: company.bankDetail
          ? {
              accountName: company.bankDetail.accountName,
              accountNumber: company.bankDetail.accountNumber,
              ifsc: company.bankDetail.ifsc,
              bankName: company.bankDetail.bankName,
              branch: company.bankDetail.branch,
            }
          : { accountName: "", accountNumber: "", ifsc: "", bankName: "", branch: "" },
      });
      // Synchronizing local preview state with the fetched company record
      // (an external data source), not deriving it from props/state that's
      // already available during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogoUrl(company.logoUrl ?? undefined);
      setSignatureUrl(company.signatureUrl ?? undefined);
    }
  }, [company, form]);

  async function handleUpload(file: File, kind: "logo" | "signature") {
    try {
      const { url } = await uploadFile(file);
      if (kind === "logo") setLogoUrl(url);
      else setSignatureUrl(url);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function onSubmit(values: CompanyInput) {
    try {
      await updateMutation.mutateAsync({ ...values, logoUrl, signatureUrl });
      toast.success("Company profile saved");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) {
          form.setError(field as keyof CompanyInput, { message });
        }
      }
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address line 1</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 2 (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="signatoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authorized signatory name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormLabel>Logo</FormLabel>
                <div className="mt-2 flex items-center gap-3">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Company logo" className="size-12 rounded border object-contain" />
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    Upload logo
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")}
                  />
                </div>
              </div>
              <div>
                <FormLabel>Signature</FormLabel>
                <div className="mt-2 flex items-center gap-3">
                  {signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="h-12 w-24 rounded border object-contain"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureInputRef.current?.click()}
                  >
                    Upload signature
                  </Button>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "signature")}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankDetail.accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetail.accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetail.ifsc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetail.bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetail.branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
