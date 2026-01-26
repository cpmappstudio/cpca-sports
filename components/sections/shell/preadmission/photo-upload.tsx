"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useImageUpload } from "@/hooks/use-image-upload";

interface PhotoUploadProps {
  value?: Id<"_storage"> | null;
  onChange: (storageId: Id<"_storage"> | null) => void;
  required?: boolean;
}

export function PhotoUpload({ value, onChange, required }: PhotoUploadProps) {
  const { uploadImage, isUploading, error } = useImageUpload({
    onSuccess: onChange,
  });

  const photoUrl = useQuery(
    api.files.getUrl,
    value ? { storageId: value } : "skip",
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="photo">
          Photo {required && <span className="text-destructive">*</span>}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a recent photo. Max size: 10MB
        </p>
      </div>

      <div className="flex items-start gap-4">
        {value && photoUrl !== undefined && (
          <div className="relative w-24 h-24 rounded-md overflow-hidden border shrink-0">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Uploaded photo"
                fill
                className="object-cover"
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
        )}

        <div className="flex-1 space-y-2">
          <Input
            id="photo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            required={required && !value}
          />
          {isUploading && (
            <p className="text-sm text-muted-foreground">Uploading photo...</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {value && !isUploading && (
            <p className="text-sm text-green-600">
              Photo uploaded successfully
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
