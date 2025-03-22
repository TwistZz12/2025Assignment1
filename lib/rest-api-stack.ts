import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Game Table
    const gamesTable = new dynamodb.Table(this, "GamesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "itemType", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "GameItems",
    });

    // Lambda Function - Add Game
    const addGameFn = new lambdanode.NodejsFunction(this, "AddGameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addGame.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gamesTable.tableName,
        REGION: "eu-west-1",
      },
    });

    gamesTable.grantReadWriteData(addGameFn);

    // REST API
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Game Management API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const apiKey = new apig.ApiKey(this, "GameApiKey", {
      description: "API Key for protected game endpoints",
      enabled: true,
    });

    const usagePlan = new apig.UsagePlan(this, "GameUsagePlan", {
      name: "GameUsagePlan",
      apiStages: [
        {
          api,
          stage: api.deploymentStage,
        },
      ],
    });

    usagePlan.addApiKey(apiKey);

    // /games endpoint
    const gamesEndpoint = api.root.addResource("games");
    gamesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addGameFn),
      {
        apiKeyRequired: true,
      }
    );
  }
}
