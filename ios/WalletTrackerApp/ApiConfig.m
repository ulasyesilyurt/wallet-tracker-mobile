#import <React/RCTBridgeModule.h>

@interface ApiConfig : NSObject <RCTBridgeModule>
@end

@implementation ApiConfig

RCT_EXPORT_MODULE(ApiConfig)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSDictionary *)constantsToExport
{
#if DEBUG
  BOOL isRelease = NO;
#else
  BOOL isRelease = YES;
#endif
  NSString *apiOrigin = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"APIBaseURL"] ?: @"";
  NSString *googleWebClientId = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"GoogleWebClientID"] ?: @"";
  NSString *googleIosClientId = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"GoogleIOSClientID"] ?: @"";
  NSString *googleIosReversedClientId = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"GoogleIOSReversedClientID"] ?: @"";
  return @{
    @"apiOrigin": apiOrigin,
    @"isRelease": @(isRelease),
    @"googleWebClientId": googleWebClientId,
    @"googleIosClientId": googleIosClientId,
    @"googleIosReversedClientId": googleIosReversedClientId,
  };
}

@end
