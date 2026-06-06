export default function LoadingSpinner({ size = 24 }) {
  return (
    <div
      className="border-2 border-green-200 border-t-green-600 rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonCard({ height = 120 }) {
  return <div className="card animate-pulse bg-gray-100" style={{ height }} />;
}
