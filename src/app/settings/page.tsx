"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsForm } from "@/features/settings/components/company-settings-form";
import { NumberingSettingsTable } from "@/features/settings/components/numbering-settings-table";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Company profile, bank details, and document numbering." />
      <Tabs defaultValue="company">
        <TabsList className="mb-4">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>
        <TabsContent value="company">
          <CompanySettingsForm />
        </TabsContent>
        <TabsContent value="numbering">
          <NumberingSettingsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
