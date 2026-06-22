import * as cdk from "aws-cdk-lib";
import { AnchorAnalyticsStack } from "../lib/analytics-stack";

const app = new cdk.App();

new AnchorAnalyticsStack(app, "AnchorAnalyticsDev", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.ANALYTICS_AWS_REGION || process.env.AWS_REGION || "ap-southeast-2"
  }
});
