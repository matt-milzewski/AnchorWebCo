import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";

export class AnchorAnalyticsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "AnalyticsTable", {
      tableName: "anchor_analytics",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const scriptBucket = new s3.Bucket(this, "ScriptBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const distribution = new cloudfront.Distribution(this, "ScriptDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(scriptBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      defaultRootObject: "anchor-analytics.js",
      comment: "Anchor Web Co analytics tracking script"
    });

    new s3deploy.BucketDeployment(this, "DeployTrackingScript", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "..", "..", "public"))],
      destinationBucket: scriptBucket,
      distribution,
      distributionPaths: ["/*"]
    });

    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, "..", "..", "lambda"));
    const stackUniqueId = cdk.Fn.select(2, cdk.Fn.split("/", cdk.Aws.STACK_ID));
    const commonEnv = {
      ANALYTICS_TABLE_NAME: table.tableName,
      ANALYTICS_DAILY_SALT_SECRET: cdk.Fn.join(":", ["anchor-analytics-daily-salt", stackUniqueId]),
      REPORT_FROM_EMAIL: "info@anchorwebco.com.au",
      ALARM_EMAIL: "info@anchorwebco.com.au"
    };

    const ingest = new lambda.Function(this, "IngestFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "ingest.handler",
      code: lambdaCode,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      environment: commonEnv
    });
    const tableArn = table.tableArn;
    const noScanRead = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:DescribeTable"];
    const noScanWrite = ["dynamodb:PutItem", "dynamodb:UpdateItem"];
    ingest.addToRolePolicy(new iam.PolicyStatement({
      actions: [...noScanRead, ...noScanWrite],
      resources: [tableArn]
    }));

    const ingestUrl = ingest.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["content-type"],
        maxAge: cdk.Duration.hours(1)
      }
    });

    const alarmTopic = new sns.Topic(this, "AnalyticsAlarmTopic", {
      displayName: "Anchor Web Co analytics alerts"
    });
    alarmTopic.addSubscription(new subscriptions.EmailSubscription("info@anchorwebco.com.au"));

    const requestsMetric = ingest.metric("UrlRequestCount", {
      statistic: "Sum",
      period: cdk.Duration.days(1)
    });
    const acceptedMetric = new cloudwatch.Metric({
        namespace: "AnchorWebCo/Analytics",
        metricName: "AcceptedEvents",
        dimensionsMap: { Service: "Ingest" },
        statistic: "Sum",
        period: cdk.Duration.days(1)
    });
    const collectionFailedAlarm = new cloudwatch.Alarm(this, "AnalyticsCollectionHealth", {
      alarmDescription: "The analytics endpoint received requests but accepted no events during the daily period.",
      metric: new cloudwatch.MathExpression({
        expression: "IF(requests >= 1, IF(FILL(accepted, 0) < 1, 1, 0), 0)",
        usingMetrics: { requests: requestsMetric, accepted: acceptedMetric },
        period: cdk.Duration.days(1),
        label: "Collection failure"
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
    collectionFailedAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    const ingestErrorsAlarm = new cloudwatch.Alarm(this, "AnalyticsIngestErrors", {
      alarmDescription: "The analytics ingestion Lambda returned an unhandled error.",
      metric: ingest.metricErrors({ statistic: "Sum", period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
    ingestErrorsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    const reporter = new lambda.Function(this, "ReportFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "report.handler",
      code: lambdaCode,
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: {
        ...commonEnv,
        INGEST_FUNCTION_URL: ingestUrl.url
      }
    });
    reporter.addToRolePolicy(new iam.PolicyStatement({
      actions: noScanRead,
      resources: [tableArn]
    }));
    const reportErrorsAlarm = new cloudwatch.Alarm(this, "AnalyticsReportErrors", {
      alarmDescription: "The monthly analytics report failed to generate or send.",
      metric: reporter.metricErrors({ statistic: "Sum", period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
    reportErrorsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    reporter.addToRolePolicy(new iam.PolicyStatement({
      actions: ["ses:SendEmail"],
      resources: ["*"],
      conditions: {
        StringEquals: { "ses:FromAddress": "info@anchorwebco.com.au" }
      }
    }));

    new events.Rule(this, "MonthlyReportSchedule", {
      schedule: events.Schedule.cron({ minute: "15", hour: "22", day: "1" }),
      targets: [new targets.LambdaFunction(reporter)]
    });

    const dashboard = new lambda.Function(this, "DashboardReadFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "dashboard.handler",
      code: lambdaCode,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        ...commonEnv,
        DASHBOARD_TOKEN_SECRET: cdk.Fn.join(":", ["anchor-analytics-dashboard", stackUniqueId])
      }
    });
    dashboard.addToRolePolicy(new iam.PolicyStatement({
      actions: noScanRead,
      resources: [tableArn]
    }));
    const dashboardUrl = dashboard.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.GET],
        allowedHeaders: ["content-type"],
        maxAge: cdk.Duration.hours(1)
      }
    });

    const seed = new lambda.Function(this, "SeedTenantsFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "seed.handler",
      code: lambdaCode,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: commonEnv
    });
    seed.addToRolePolicy(new iam.PolicyStatement({
      actions: [...noScanRead, ...noScanWrite],
      resources: [tableArn]
    }));

    new cdk.CustomResource(this, "SeedInitialTenants", {
      serviceToken: seed.functionArn,
      properties: {
        tenantConfigVersion: "2026-07-28-v2"
      }
    });

    new budgets.CfnBudget(this, "AnalyticsBudget", {
      budget: {
        budgetName: "anchor-analytics-dev-budget",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: 5, unit: "USD" }
      },
      notificationsWithSubscribers: [{
        notification: {
          notificationType: "ACTUAL",
          comparisonOperator: "GREATER_THAN",
          threshold: 80,
          thresholdType: "PERCENTAGE"
        },
        subscribers: [{
          subscriptionType: "EMAIL",
          address: "info@anchorwebco.com.au"
        }]
      }]
    });

    new cdk.CfnOutput(this, "IngestFunctionUrl", { value: ingestUrl.url });
    new cdk.CfnOutput(this, "DashboardFunctionUrl", { value: dashboardUrl.url });
    new cdk.CfnOutput(this, "TrackingScriptUrl", {
      value: `https://${distribution.distributionDomainName}/anchor-analytics.js`
    });
    new cdk.CfnOutput(this, "AnalyticsTableName", { value: table.tableName });
  }
}
