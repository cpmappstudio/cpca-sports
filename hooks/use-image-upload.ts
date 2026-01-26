"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  compressImage,
  type CompressionOptions,
} from "@/lib/utils/image-compression";

export interface UseImageUploadOptions {
  /** Maximum file size in bytes before compression. Default: 10MB */
  maxFileSize?: number;
  /** Compression options */
  compression?: CompressionOptions;
  /** Callback on successful upload */
  onSuccess?: (storageId: Id<"_storage">) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseImageUploadReturn {
  /** Upload an image file with compression */
  uploadImage: (file: File) => Promise<Id<"_storage"> | null>;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Current error message */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useImageUpload(
  options: UseImageUploadOptions = {},
): UseImageUploadReturn {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    compression,
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const clearError = useCallback(() => setError(null), []);

  const uploadImage = useCallback(
    async (file: File): Promise<Id<"_storage"> | null> => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        const errorMsg = "Please select an image file";
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      }

      // Validate file size (before compression)
      if (file.size > maxFileSize) {
        const errorMsg = `File size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`;
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      }

      setError(null);
      setIsUploading(true);

      try {
        // Compress the image
        const compressedFile = await compressImage(file, compression);

        // Generate upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // Upload to Convex storage
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();
        onSuccess?.(storageId);
        return storageId as Id<"_storage">;
      } catch (err) {
        const errorMsg = "Failed to upload image";
        setError(errorMsg);
        onError?.(errorMsg);
        console.error("[useImageUpload] Upload error:", err);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [maxFileSize, compression, generateUploadUrl, onSuccess, onError],
  );

  return {
    uploadImage,
    isUploading,
    error,
    clearError,
  };
}
