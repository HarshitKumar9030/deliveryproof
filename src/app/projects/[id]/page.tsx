import { ProjectDetail } from '@/components/project-detail';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <ProjectDetail
      id={id}
      requestedTab={typeof query.tab === 'string' ? query.tab : 'overview'}
    />
  );
}
