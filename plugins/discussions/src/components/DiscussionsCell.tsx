export function DiscussionsCell({
  cellData,
}: {
  cellData: number[] | null | undefined;
}) {
  const count = cellData?.length ?? 0;
  return <span>{count}</span>;
}
