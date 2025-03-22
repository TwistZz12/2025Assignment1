import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const ddbClient = new DynamoDBClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const gameId = event.pathParameters?.gameId;

  if (!gameId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing gameId in path parameters" }),
    };
  }

  try {
    await ddbClient.send(
      new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          itemType: { S: "game" },
          itemId: { S: gameId },
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Game deleted successfully" }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error deleting game", error: err.message }),
    };
  }
};
