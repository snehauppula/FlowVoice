import { EmptyState, PageHeader } from "@/components/ui/page";
import { ALL_NAV_ITEMS } from "@/lib/nav";

/**
 * Honest placeholder for pages whose feature work is a later milestone.
 * It states plainly that the feature is not built yet rather than faking data.
 */
export function ModulePage({ href, next }: { href: string; next: string }) {
  const item = ALL_NAV_ITEMS.find((i) => i.href === href);
  return (
    <>
      <PageHeader title={item?.label ?? "Page"} description={item?.description} />
      <EmptyState title="Not built yet" description={`Planned next: ${next}`} />
    </>
  );
}
