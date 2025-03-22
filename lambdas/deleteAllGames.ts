import {
    DynamoDBClient,
    ScanCommand,
    BatchWriteItemCommand,
  } from "@aws-sdk/client-dynamodb";
  import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
  
  const ddbClient = new DynamoDBClient({});
  
  export const handler = async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    try {
      const scanResult = await ddbClient.send(
        new ScanCommand({
          TableName: process.env.TABLE_NAME,
          FilterExpression: "itemType = :type",
          ExpressionAttributeValues: {
            ":type": { S: "game" },
          },
          ProjectionExpression: "itemType, itemId",
        })
      );
  
      if (!scanResult.Items || scanResult.Items.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "No games found to delete." }),
        };
      }
  
      const deleteRequests = scanResult.Items.map((item) => ({
        DeleteRequest: {
          Key: {
            itemType: item.itemType,
            itemId: item.itemId,
          },
        },
      }));
  
      await ddbClient.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [process.env.TABLE_NAME!]: deleteRequests,
          },
        })
      );
  
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "All games deleted successfully." }),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error deleting games", error: err.message }),
      };
    }
  };
  