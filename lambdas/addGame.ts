import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddbClient = new DynamoDBClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing request body" }),
    };
  }

  const data = JSON.parse(event.body);
  const item = {
    itemType: "game",
    itemId: `game#${uuidv4()}`,
    title: data.title || "Untitled Game",
    overview: data.overview || "",
    rating: Number(data.rating) || 0,
    visible: data.visible ?? true,
  };

  try {
    await ddbClient.send(
      new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall(item),
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Game added", item }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error adding game", error: err.message }),
    };
  }
};
