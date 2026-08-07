import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

let faceDetectorInstance = null;
let isDetectorLoading = false;

/**
 * Lazy load MediaPipe FaceDetector Wasm model.
 */
export async function getFaceDetector() {
  if (faceDetectorInstance) return faceDetectorInstance;
  if (isDetectorLoading) {
    while (isDetectorLoading) {
      await new Promise((res) => setTimeout(res, 100));
    }
    return faceDetectorInstance;
  }

  isDetectorLoading = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
  } catch (err) {
    console.error('Failed to initialize MediaPipe FaceDetector:', err);
    faceDetectorInstance = null;
    throw err;
  } finally {
    isDetectorLoading = false;
  }

  return faceDetectorInstance;
}

/**
 * PresenceDetectionEngine manages camera stream, detection loop, adaptive throttling, and page visibility.
 */
export class PresenceDetectionEngine {
  constructor({ onCheckResult, onError }) {
    this.onCheckResult = onCheckResult;
    this.onError = onError;

    this.stream = null;
    this.videoElement = null;
    this.timerId = null;

    this.currentIntervalMs = 3000; // default 3s
    this.slowCount = 0;
    this.isRunning = false;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false,
      });

      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      this.videoElement.srcObject = this.stream;

      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      this.scheduleNextCheck();
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      this.stop();
      if (this.onError) this.onError(err);
    }
  }

  scheduleNextCheck() {
    if (!this.isRunning || document.hidden) return;

    this.timerId = setTimeout(async () => {
      await this.performCheck();
      if (this.isRunning) {
        this.scheduleNextCheck();
      }
    }, this.currentIntervalMs);
  }

  async performCheck() {
    if (!this.isRunning || !this.videoElement || document.hidden) return;

    const startTime = performance.now();
    let isPresent = false;

    try {
      const detector = await getFaceDetector();
      if (detector && this.videoElement.readyState >= 2) {
        const result = detector.detect(this.videoElement);
        isPresent = result && result.detections && result.detections.length > 0;
      }
    } catch (err) {
      console.warn('Presence detection error:', err);
      if (this.onError) this.onError(err);
      return;
    }

    const execTime = performance.now() - startTime;

    // Adaptive Throttling: if detection takes > 200ms for 3 consecutive times, increase interval
    if (execTime > 200) {
      this.slowCount++;
      if (this.slowCount >= 3) {
        this.currentIntervalMs = 8000; // slow client -> 8 seconds
      }
    } else if (execTime < 80) {
      this.slowCount = 0;
      this.currentIntervalMs = 3000; // fast client -> 3 seconds
    }

    if (this.onCheckResult) {
      this.onCheckResult({
        present: isPresent,
        timestamp: new Date().toISOString(),
        execTimeMs: Math.round(execTime),
      });
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      if (this.stream) {
        this.stream.getVideoTracks().forEach((t) => (t.enabled = false));
      }
    } else {
      if (this.stream) {
        this.stream.getVideoTracks().forEach((t) => (t.enabled = true));
      }
      this.scheduleNextCheck();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}
