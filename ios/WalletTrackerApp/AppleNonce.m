#import <React/RCTBridgeModule.h>
#import <CommonCrypto/CommonDigest.h>
#import <Security/SecRandom.h>

@interface AppleNonce : NSObject <RCTBridgeModule>
@end

@implementation AppleNonce

RCT_EXPORT_MODULE(AppleNonce)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_REMAP_METHOD(generate,
                 generateWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  uint8_t randomBytes[32];
  OSStatus status = SecRandomCopyBytes(kSecRandomDefault, sizeof(randomBytes), randomBytes);
  if (status != errSecSuccess) {
    reject(@"APPLE_NONCE_GENERATION_FAILED", @"Unable to create a secure nonce.", nil);
    return;
  }

  NSMutableString *rawNonce = [NSMutableString stringWithCapacity:sizeof(randomBytes) * 2];
  for (NSUInteger index = 0; index < sizeof(randomBytes); index++) {
    [rawNonce appendFormat:@"%02x", randomBytes[index]];
  }

  NSData *nonceData = [rawNonce dataUsingEncoding:NSUTF8StringEncoding];
  uint8_t digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(nonceData.bytes, (CC_LONG)nonceData.length, digest);
  NSMutableString *expectedNonce = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
  for (NSUInteger index = 0; index < CC_SHA256_DIGEST_LENGTH; index++) {
    [expectedNonce appendFormat:@"%02x", digest[index]];
  }

  resolve(@{@"rawNonce": rawNonce, @"expectedNonce": expectedNonce});
}

@end
