import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { ROUTES } from "@/lib/navigation/routes";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TenantRootPage({ params }: PageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();

  // Use Convex to check admin status (more reliable than Clerk has() on first load)
  const preloadedIsAdmin = await preloadQuery(
    api.organizations.isAdminInOrg,
    { slug: tenant },
    { token },
  );
  const isAdmin = preloadedQueryResult(preloadedIsAdmin);

  if (isAdmin) {
    redirect(ROUTES.org.applications.list(tenant));
  }

  const preloadedApplications = await preloadQuery(
    api.applications.listMine,
    {},
    { token },
  );
  const applications = preloadedQueryResult(preloadedApplications);

  if (applications.length === 0) {
    redirect(ROUTES.org.applications.create(tenant));
  }

  redirect(ROUTES.org.applications.list(tenant));
}
