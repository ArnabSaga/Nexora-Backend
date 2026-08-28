import type {
  TSearchBucketCounts,
  TSearchBucketSlice,
} from "./search.interface";

const BUCKETS = ["exact", "prefix", "contains"] as const;

export const calculateRankedSearchSlices = ({
  page,
  limit,
  counts,
}: {
  page: number;
  limit: number;
  counts: TSearchBucketCounts;
}): TSearchBucketSlice[] => {
  const pageStart = (page - 1) * limit;
  const pageEnd = pageStart + limit;
  let bucketStart = 0;
  const slices: TSearchBucketSlice[] = [];

  for (const bucket of BUCKETS) {
    const bucketEnd = bucketStart + counts[bucket];
    const overlapStart = Math.max(pageStart, bucketStart);
    const overlapEnd = Math.min(pageEnd, bucketEnd);

    if (overlapStart < overlapEnd) {
      slices.push({
        bucket,
        skip: overlapStart - bucketStart,
        take: overlapEnd - overlapStart,
      });
    }
    bucketStart = bucketEnd;
  }

  return slices;
};

export const createSearchMeta = (
  page: number,
  limit: number,
  counts: TSearchBucketCounts,
) => {
  const total = counts.exact + counts.prefix + counts.contains;
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
};
