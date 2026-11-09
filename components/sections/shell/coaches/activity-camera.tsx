"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Circle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ActivityCamera,
  type CameraState,
  type CameraError,
} from "@/lib/coaches/camera";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ActivityCameraCapture({
  photo,
  onCapture,
  disabled = false,
}: {
  photo: Blob | null;
  onCapture: (photo: Blob | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Coaches.camera");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<ActivityCamera | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<CameraError>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    let active = true;
    const camera = new ActivityCamera(videoRef.current!, (next, failure) => {
      if (!active) return;
      setState(next);
      setError(failure);
      if (next !== "live") setDevices([]);
      else
        void camera.devices().then((available) => {
          if (!active || camera.state !== "live") return;
          setDevices(available);
          setDeviceId(camera.deviceId ?? "");
        });
    });
    cameraRef.current = camera;
    const pause = () => {
      if (
        !["requesting", "loading", "live", "capturing"].includes(camera.state)
      )
        return;
      camera.stop();
      setError("interrupted");
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    return () => {
      active = false;
      camera.stop();
      cameraRef.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const busy = ["requesting", "loading", "capturing"].includes(state);
  const streaming = ["loading", "live", "capturing"].includes(state);
  const capture = async () => {
    try {
      const blob = await cameraRef.current?.capture();
      if (blob) onCapture(blob);
    } catch {
      /* The camera reports capture errors through its state callback. */
    }
  };
  const start = () => {
    onCapture(null);
    void cameraRef.current?.start();
  };

  return (
    <div
      role="group"
      aria-label={t("placeholder")}
      className="overflow-hidden rounded-xl border bg-muted/30"
    >
      <div
        className={`relative overflow-hidden ${streaming || photo || state === "captured" ? "aspect-[4/3] bg-black" : ""}`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          hidden={!streaming}
          aria-label={t("livePreview")}
          className="absolute inset-0 size-full object-contain"
        />
        {photo && preview ? (
          <Image
            src={preview}
            alt={t("capturedPhoto")}
            fill
            unoptimized
            sizes="(max-width: 640px) 90vw, 480px"
            className="object-contain"
          />
        ) : null}
        {!streaming && !photo && state !== "captured" ? (
          <div className="flex flex-col items-center gap-4 px-5 py-6 text-center sm:py-8">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Camera className="size-7" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold">{t("placeholder")}</p>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t("cameraOnly")}
              </p>
            </div>
            {!busy ? (
              <Button
                type="button"
                onClick={start}
                disabled={disabled}
                className="min-h-11 w-full sm:w-auto sm:px-6"
              >
                <Camera />
                {t("activate")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {state === "live" ? (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            <Circle className="size-2 fill-red-500 text-red-500" />
            {t("live")}
          </span>
        ) : null}
      </div>
      <div className="space-y-3 border-t bg-background/60 p-4">
        <p
          role="status"
          aria-live="polite"
          className={`text-sm leading-relaxed ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error
            ? t(`errors.${error}`)
            : photo
              ? t("photoReady")
              : t(`states.${state}`)}
        </p>
        {devices.length > 1 ? (
          <div className="space-y-2">
            <Label htmlFor="activity-camera-device">{t("device")}</Label>
            <select
              id="activity-camera-device"
              value={deviceId}
              disabled={disabled}
              onChange={(event) =>
                void cameraRef.current?.start(event.target.value)
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-base"
            >
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || t("deviceNumber", { number: index + 1 })}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {busy || streaming || photo ? (
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {state === "live" ? (
              <Button
                type="button"
                onClick={capture}
                disabled={disabled}
                className="min-h-11 flex-1"
              >
                <Camera />
                {t("takePhoto")}
              </Button>
            ) : null}
            {busy || streaming ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => cameraRef.current?.stop()}
                disabled={disabled}
                className="min-h-11 font-normal text-muted-foreground"
              >
                {streaming ? t("turnOff") : t("cancel")}
              </Button>
            ) : null}
            {photo ? (
              <Button
                type="button"
                variant="link"
                onClick={start}
                disabled={disabled}
                className="min-h-11 font-normal"
              >
                <RotateCcw />
                {t("retake")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
