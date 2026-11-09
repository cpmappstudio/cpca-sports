export type CameraState =
  | "idle"
  | "requesting"
  | "loading"
  | "live"
  | "capturing"
  | "captured"
  | "error";
export const CAMERA_ERRORS = [
  "insecure",
  "unsupported",
  "frame",
  "encode",
  "interrupted",
  "NotAllowedError",
  "NotFoundError",
  "NotReadableError",
  "OverconstrainedError",
  "AbortError",
  "InvalidStateError",
  "unknown",
] as const;
export type CameraError = (typeof CAMERA_ERRORS)[number];

function errorCode(error: unknown): CameraError {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : null;
  return typeof name === "string" && CAMERA_ERRORS.includes(name as CameraError)
    ? (name as CameraError)
    : "unknown";
}

function fail(code: CameraError) {
  const error = new Error(code);
  error.name = code;
  return error;
}

export class ActivityCamera {
  private stream: MediaStream | null = null;
  private generation = 0;
  private cancelFrame: (() => void) | null = null;
  state: CameraState = "idle";

  constructor(
    private video: HTMLVideoElement,
    private onState: (state: CameraState, error?: CameraError) => void,
  ) {}

  private emit(state: CameraState, error?: CameraError) {
    this.state = state;
    this.onState(state, error);
  }

  stop(state: CameraState = "idle") {
    this.generation += 1;
    this.cancelFrame?.();
    this.cancelFrame = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.emit(state);
  }

  async start(deviceId?: string) {
    this.stop();
    const generation = this.generation;
    if (!window.isSecureContext) {
      this.emit("error", "insecure");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.emit("error", "unsupported");
      return;
    }
    this.emit("requesting");
    let stream: MediaStream | undefined;
    try {
      const video: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          };
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video,
        });
      } catch (error) {
        if (
          errorCode(error) !== "OverconstrainedError" ||
          generation !== this.generation
        )
          throw error;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const interrupted = () => {
        if (generation !== this.generation) return;
        this.stop();
        this.emit("error", "interrupted");
      };
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", interrupted, { once: true });
        track.addEventListener("mute", interrupted, { once: true });
      });
      this.video.srcObject = stream;
      this.emit("loading");
      await this.video.play();
      if (generation !== this.generation) return;
      const ready = await this.waitForFrame();
      if (generation !== this.generation) return;
      if (!ready) throw fail("frame");
      this.emit("live");
    } catch (error) {
      if (generation !== this.generation) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stop();
      this.emit("error", errorCode(error));
    }
  }

  private waitForFrame() {
    return new Promise<boolean>((resolve) => {
      const deadline = Date.now() + 10000;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (ready: boolean) => {
        clearTimeout(timer);
        this.cancelFrame = null;
        resolve(ready);
      };
      this.cancelFrame = () => finish(false);
      const check = () => {
        if (
          this.video.readyState >= 2 &&
          this.video.videoWidth > 0 &&
          this.video.videoHeight > 0
        ) {
          finish(true);
          return;
        }
        if (Date.now() >= deadline) {
          finish(false);
          return;
        }
        timer = setTimeout(check, 80);
      };
      check();
    });
  }

  async capture() {
    if (this.state !== "live") return null;
    const generation = this.generation;
    try {
      if (
        !this.stream
          ?.getVideoTracks()
          .some((track) => track.readyState === "live") ||
        this.video.readyState < 2 ||
        this.video.videoWidth <= 0 ||
        this.video.videoHeight <= 0
      )
        throw fail("frame");
      this.emit("capturing");
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        1280 / Math.max(this.video.videoWidth, this.video.videoHeight),
      );
      canvas.width = Math.max(1, Math.round(this.video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(this.video.videoHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw fail("encode");
      context.drawImage(this.video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (generation !== this.generation) return null;
      if (!blob?.size) throw fail("encode");
      this.stop("captured");
      return blob;
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        this.emit("error", errorCode(error));
      }
      throw error;
    }
  }

  async devices() {
    if (this.state !== "live") return [];
    try {
      return (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "videoinput",
      );
    } catch {
      return [];
    }
  }

  get deviceId() {
    return this.stream?.getVideoTracks()[0]?.getSettings().deviceId;
  }
}
