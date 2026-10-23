import type { Metadata } from "next";
import { EmployeeWizard } from "@/components/employees/employee-wizard";
import { PageHeader } from "@/components/ui/page";
import { emptyEmployee } from "@/lib/validations/employee";

export const metadata: Metadata = { title: "New Employee" };

export default function NewEmployeePage() {
  return (
    <>
      <PageHeader title="New Employee" description="Set up an AI employee step by step. Nothing is saved until you finish." />
      <EmployeeWizard employeeId={null} initial={emptyEmployee} />
    </>
  );
}
