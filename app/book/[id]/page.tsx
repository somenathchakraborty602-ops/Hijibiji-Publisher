import DynamicBookClient from '@/components/pages/DynamicBookClient';

export default async function DynamicBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DynamicBookClient bookId={id} />;
}
