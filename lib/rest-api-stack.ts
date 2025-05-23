import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Game Table
    const gameTable = new dynamodb.Table(this, "GameTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "itemType", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "GameItems",
    });

    // Lambda - Add Game
    const addGameFn = new lambdanode.NodejsFunction(this, "AddGameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addGame.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gameTable.tableName,
        REGION: "eu-west-1",
      },
    });
    gameTable.grantReadWriteData(addGameFn);


    // Lambda - Get Games By Id
    const getGameByIdFn = new lambdanode.NodejsFunction(this, "GetGameByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getGameById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gameTable.tableName,
        REGION: "eu-west-1",
      },
    });
    gameTable.grantReadData(getGameByIdFn);
    

    // Lambda - Get All Games
    const getAllGamesFn = new lambdanode.NodejsFunction(this, "GetAllGamesFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllGames.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gameTable.tableName,
        REGION: "eu-west-1",
      },
    });
    gameTable.grantReadData(getAllGamesFn);

      // Lambda - Delete Game
  const deleteGameFn = new lambdanode.NodejsFunction(this, "DeleteGameFn", {
    architecture: lambda.Architecture.ARM_64,
    runtime: lambda.Runtime.NODEJS_18_X,
    entry: `${__dirname}/../lambdas/deleteGame.ts`,
    timeout: cdk.Duration.seconds(10),
    memorySize: 128,
    environment: {
      TABLE_NAME: gameTable.tableName,
      REGION: "eu-west-1",
    },
    });
    gameTable.grantWriteData(deleteGameFn);

    // Lambda - Update Game
    const updateGameFn = new lambdanode.NodejsFunction(this, "UpdateGameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/updateGame.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gameTable.tableName,
        REGION: "eu-west-1",
      },
    });
    gameTable.grantReadWriteData(updateGameFn);
    
    //Lambda - Patch Game
    const patchGameFn = new lambdanode.NodejsFunction(this, "PatchGameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/patchGame.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gameTable.tableName,
        REGION: "eu-west-1",
      },
    });
    gameTable.grantReadWriteData(patchGameFn);
    
    // Lambda - Delete All Games
    const deleteAllGamesFn = new lambdanode.NodejsFunction(this, "DeleteAllGamesFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteAllGames.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: gameTable.tableName,
        REGION: "eu-west-1",
      },
    });
gameTable.grantReadWriteData(deleteAllGamesFn);

      // Lambda - Translate Game Overview
    const translateGameFn = new lambdanode.NodejsFunction(this, "TranslateGameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
     entry: `${__dirname}/../lambdas/translateGame.ts`,
     timeout: cdk.Duration.seconds(10),
     memorySize: 128,
     environment: {
       TABLE_NAME: gameTable.tableName,
       REGION: "eu-west-1",
       },
    });
gameTable.grantReadWriteData(translateGameFn);

    translateGameFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
       actions: ["translate:TranslateText"],
        resources: ["*"], 
      })
    );


    

    // API Gateway Setup
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Game management API",
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

    // create CfnApiKey
const rawApiKey = new apig.CfnApiKey(this, "AssignmentRawApiKey", {
  enabled: true,
  name: "AssignmentAPIKey",
  value: "my-secret-api-key-2025", 
});

//  Usage Plan
const usagePlan = new apig.UsagePlan(this, "AssignmentUsagePlan", {
  name: "AssignmentUsagePlan",
  apiStages: [{
    api,
    stage: api.deploymentStage,
  }],
});


new apig.CfnUsagePlanKey(this, "AssignmentUsagePlanKey", {
  keyId: rawApiKey.ref,
  keyType: "API_KEY",
  usagePlanId: usagePlan.usagePlanId,
});

//  API Key Output
new cdk.CfnOutput(this, "RestApiKeyOutput", {
  value: rawApiKey.value!,
  description: "The actual API key to use in Postman or headers",
});


    // /games endpoint
    const gamesEndpoint = api.root.addResource("games");
    gamesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addGameFn, { proxy: true })
    );
    gamesEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllGamesFn, { proxy: true })
    );

    const specificGameEndpoint = gamesEndpoint.addResource("{gameId}");
    specificGameEndpoint.addMethod(
  "GET",
      new apig.LambdaIntegration(getGameByIdFn, { proxy: true })
    );
    specificGameEndpoint.addMethod(
  "DELETE",
      new apig.LambdaIntegration(deleteGameFn, { proxy: true })
    );
    specificGameEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateGameFn, { proxy: true })
    );
    specificGameEndpoint.addMethod(
      "PATCH",
      new apig.LambdaIntegration(patchGameFn, { proxy: true })
    );
    gamesEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteAllGamesFn, { proxy: true })
    );
    const translationEndpoint = specificGameEndpoint.addResource("translation");
translationEndpoint.addMethod(
  "GET",
  new apig.LambdaIntegration(translateGameFn, { proxy: true })
);

  }
}
