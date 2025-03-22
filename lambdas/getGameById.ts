import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddbClient = new DynamoDBClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const rawGameId = event.pathParameters?.gameId;
  const gameId = decodeURIComponent(rawGameId ?? "");

  if (!gameId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing gameId in path parameters" }),
    };
  }

  try {
    const result = await ddbClient.send(
      new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          itemType: { S: "game" },
          itemId: { S: gameId },
        },
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Game not found" }),
      };
    }

    const game = unmarshall(result.Item);

    return {
      statusCode: 200,
      body: JSON.stringify({ game }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error fetching game", error: err.message }),
    };
  }
};
