import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { ReturnValue } from "@aws-sdk/client-dynamodb";

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

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing request body" }),
    };
  }

  const data = JSON.parse(event.body);

  try {
    const updateParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
          itemType: { S: "game" },
          itemId: { S: gameId },
        },
        UpdateExpression:
          "SET #title = :title, #overview = :overview, #rating = :rating, #visible = :visible",
        ExpressionAttributeNames: {
          "#title": "title",
          "#overview": "overview",
          "#rating": "rating",
          "#visible": "visible",
        },
        ExpressionAttributeValues: marshall({
          ":title": data.title || "Untitled Game",
          ":overview": data.overview || "",
          ":rating": Number(data.rating) || 0,
          ":visible": data.visible ?? true,
        }),
        ReturnValues: ReturnValue.ALL_NEW, 
      };

    const result = await ddbClient.send(new UpdateItemCommand(updateParams));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Game updated", updated: result.Attributes }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating game", error: err.message }),
    };
  }
};
