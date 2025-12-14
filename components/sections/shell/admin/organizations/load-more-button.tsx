"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({
  hasNextPage,
  isFetching,
  onLoadMore,
}: LoadMoreButtonProps) {
  if (!hasNextPage) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isFetching}
      >
        {isFetching && <Loader2 className="size-4 animate-spin mr-2" />}
        Load more
      </Button>
    </div>
  );
}
