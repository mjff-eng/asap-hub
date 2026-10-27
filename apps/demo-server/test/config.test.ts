import {
  getCloudFrontKeyPairId,
  getCloudFrontPrivateKeyParameter,
  getStage,
} from '../src/config';

// outside NODE_ENV=test the babel config inlines process.env when the file is
// transformed, so these read the environment the run started with, which sets
// no CloudFront values
describe('CloudFront signing configuration', () => {
  it('has no key pair id when the stack gave none', () => {
    expect(getCloudFrontKeyPairId()).toBe('');
  });

  it("reads the signing key from the stage's own parameter by default", () => {
    expect(getCloudFrontPrivateKeyParameter()).toBe(
      `/demo-hub/${getStage()}/cloudfront-private-key`,
    );
  });
});
