// Why the bytes of a capture never arrived. The call that authorises the read
// and the download that follows it are two quite different failures, and they
// used to reach the studio as one indistinguishable message. Storage answers
// 403 for an object that was never written as readily as for one the caller may
// not have, so the halves have to name themselves.
export type CaptureStreamReason = 'unreachable' | 'too_large' | 'missing';

export class CaptureStreamError extends Error {
  readonly reason: CaptureStreamReason;

  // the status the CDN gave the signed request, absent when the fetch itself
  // never returned one
  readonly cdnStatus?: number;

  // the status the api gave the same read carried inline
  readonly inlineStatus?: number;

  readonly bytes?: number;

  constructor(
    reason: CaptureStreamReason,
    message: string,
    detail: { cdnStatus?: number; inlineStatus?: number; bytes?: number } = {},
  ) {
    super(message);
    this.name = 'CaptureStreamError';
    this.reason = reason;
    this.cdnStatus = detail.cdnStatus;
    this.inlineStatus = detail.inlineStatus;
    this.bytes = detail.bytes;
  }
}
