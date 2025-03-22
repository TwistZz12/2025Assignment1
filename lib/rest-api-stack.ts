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
    
  }
}
