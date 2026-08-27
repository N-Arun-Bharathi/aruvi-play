import React from "react";

export const SkeletonCard: React.FC = () => (
  <div className="bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-2xl animate-pulse flex flex-col justify-between">
    <div className="aspect-square w-full bg-zinc-800 rounded-xl mb-3" />
    <div className="h-4 bg-zinc-800 rounded-md w-3/4 mb-2" />
    <div className="h-3 bg-zinc-850 rounded-md w-1/2" />
  </div>
);

export const SkeletonRow: React.FC = () => (
  <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/40 rounded-xl animate-pulse my-1">
    <div className="flex items-center gap-3.5 flex-1">
      <div className="w-5 h-4 bg-zinc-800 rounded" />
      <div className="w-10 h-10 bg-zinc-800 rounded-lg shrink-0" />
      <div className="space-y-1.5 flex-1 max-w-xs">
        <div className="h-3.5 bg-zinc-800 rounded w-full" />
        <div className="h-2.5 bg-zinc-850 rounded w-2/3" />
      </div>
    </div>
    <div className="w-12 h-3 bg-zinc-800 rounded" />
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
);
