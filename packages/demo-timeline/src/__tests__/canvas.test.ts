import { chooseCanvas } from '../canvas';

describe('chooseCanvas', () => {
  it('is 1080p30 with nothing to go on', () => {
    expect(chooseCanvas([])).toEqual({ width: 1920, height: 1080, fps: 30 });
  });

  it('lifts a smaller source up to 1080p', () => {
    expect(chooseCanvas([{ width: 1280, height: 720, fps: 30 }])).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
    });
  });

  it('keeps the height of a larger source', () => {
    expect(
      chooseCanvas([{ width: 2560, height: 1440, fps: 30 }]),
    ).toMatchObject({ height: 1440, width: 2560 });
  });

  it('caps the height at 4k', () => {
    expect(chooseCanvas([{ height: 4320, fps: 30 }])).toMatchObject({
      height: 2160,
    });
  });

  it('renders at 60fps when every source is 60', () => {
    expect(
      chooseCanvas([
        { height: 1080, fps: 60 },
        { height: 1080, fps: 60 },
      ]).fps,
    ).toBe(60);
  });

  it('stays at 30fps when any source is 30', () => {
    expect(
      chooseCanvas([
        { height: 1080, fps: 60 },
        { height: 1080, fps: 30 },
      ]).fps,
    ).toBe(30);
  });

  it('treats an unprobed source as 30fps', () => {
    expect(chooseCanvas([{ height: 1080 }]).fps).toBe(30);
  });

  it('keeps both dimensions even, which every h264 encoder requires', () => {
    const { width, height } = chooseCanvas([{ height: 1081, fps: 30 }]);

    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });

  describe('a take filmed above the canvas', () => {
    // the recorder films at twice the canvas so a zoom crops real pixels;
    // delivering at that height hands the zoom back the upscale it avoided
    it('delivers at 1080p rather than following the oversample', () => {
      expect(
        chooseCanvas([{ width: 3840, height: 2160, fps: 30, recorded: true }]),
      ).toEqual({ width: 1920, height: 1080, fps: 30 });
    });

    it('stays 1080p for a 16:10 panel, whose capture is not 16:9 either', () => {
      expect(
        chooseCanvas([{ width: 3024, height: 1964, fps: 30, recorded: true }]),
      ).toEqual({ width: 1920, height: 1080, fps: 30 });
    });

    it('still follows a file the creator brought at that size', () => {
      expect(
        chooseCanvas([{ width: 3840, height: 2160, fps: 30 }]),
      ).toMatchObject({ width: 3840, height: 2160 });
    });

    it('follows an imported source beside a take', () => {
      expect(
        chooseCanvas([
          { width: 3840, height: 2160, fps: 30, recorded: true },
          { width: 2560, height: 1440, fps: 30 },
        ]),
      ).toMatchObject({ width: 2560, height: 1440 });
    });

    it('reads the frame rate of a take even though it ignores its height', () => {
      expect(
        chooseCanvas([{ width: 3840, height: 2160, fps: 60, recorded: true }]),
      ).toEqual({ width: 1920, height: 1080, fps: 60 });
    });
  });
});
