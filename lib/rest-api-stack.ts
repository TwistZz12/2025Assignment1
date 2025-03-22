import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { movies,movieCasts } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";


export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 
    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Movies",
    });
    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieCast",
    });
    const assignmentTable = new dynamodb.Table(this, "Assignment1Table", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "itemType", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "itemId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Assignment1Items",
    });
    

    movieCastsTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
    });


    
    // Functions 
    const getMovieByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: 'eu-west-1',
        },
      }
      );
      
      const getAllMoviesFn = new lambdanode.NodejsFunction(
        this,
        "GetAllMoviesFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/getAllMovies.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: moviesTable.tableName,
            REGION: 'eu-west-1',
          },
        }
        );

        const deleteMovieFn = new lambdanode.NodejsFunction(this, "DeleteMovieFn", {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_22_X,
          entry: `${__dirname}/../lambdas/deleteMovie.ts`, // Lambda 代码
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: moviesTable.tableName,
            REGION: "eu-west-1",
          },
        });
        
        //  Functions .....
    const getMovieCastMembersFn = new lambdanode.NodejsFunction(
      this,
      "GetCastMemberFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: `${__dirname}/../lambdas/getMovieCastMember.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieCastsTable.tableName,
          REGION: "eu-west-1",
        },
      }
    );

    const addAssignmentItemFn = new lambdanode.NodejsFunction(this, "AddAssignmentItemFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addAssignmentItem.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: assignmentTable.tableName,
        REGION: "eu-west-1",
      },
    });
    assignmentTable.grantReadWriteData(addAssignmentItemFn);
    

        
        
        
        new custom.AwsCustomResource(this, "moviesddbInitData", {
          onCreate: {
            service: "DynamoDB",
            action: "batchWriteItem",
            parameters: {
              RequestItems: {
                [moviesTable.tableName]: generateBatch(movies),
                [movieCastsTable.tableName]: generateBatch(movieCasts),  // Added
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), //.of(Date.now().toString()),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [moviesTable.tableArn, movieCastsTable.tableArn],  // Includes movie cast
          }),
        });
    

        const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_22_X,
          entry: `${__dirname}/../lambdas/addMovie.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: moviesTable.tableName,
            REGION: "eu-west-1",
          },
        });
        
        // Permissions 
        moviesTable.grantReadData(getMovieByIdFn)
        moviesTable.grantReadData(getAllMoviesFn)
        moviesTable.grantReadWriteData(newMovieFn)
        moviesTable.grantWriteData(deleteMovieFn);
        moviesTable.grantReadData(getMovieCastMembersFn);
        movieCastsTable.grantReadData(getMovieCastMembersFn);

           // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
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
    const apiKey = new apig.ApiKey(this, "AssignmentApiKey", {
      description: "API Key for protected assignment endpoints",
      enabled: true,
    });
    const usagePlan = new apig.UsagePlan(this, "AssignmentUsagePlan", {
      name: "AssignmentUsagePlan",
      apiStages: [{
        api,
        stage: api.deploymentStage,  
      }],
    });
    usagePlan.addApiKey(apiKey);
    

    // Movies endpoint
    const moviesEndpoint = api.root.addResource("movies");
    moviesEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
    );
    moviesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newMovieFn, { proxy: true })
    );
    // Detail movie endpoint
    const specificMovieEndpoint = moviesEndpoint.addResource("{movieId}");
    specificMovieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
    );
    //Delete method
    specificMovieEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteMovieFn, { proxy: true })
    );
    const movieCastEndpoint = moviesEndpoint.addResource("cast");

movieCastEndpoint.addMethod(
    "GET",
    new apig.LambdaIntegration(getMovieCastMembersFn, { proxy: true })
);

const assignmentEndpoint = api.root.addResource("assignment");
assignmentEndpoint.addMethod(
  "POST",
  new apig.LambdaIntegration(addAssignmentItemFn)
);
assignmentEndpoint.addMethod(
  "POST",
  new apig.LambdaIntegration(addAssignmentItemFn),
  {
    apiKeyRequired: true, 
  }
);



  
        
      }
    }
    