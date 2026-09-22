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
  return @{ @"apiOrigin": apiOrigin, @"isRelease": @(isRelease) };
}

@end
