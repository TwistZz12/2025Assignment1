import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

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
  const fields = Object.keys(data);

  if (fields.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "No fields to update" }),
    };
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  fields.forEach((key, i) => {
    const attrName = `#field${i}`;
    const attrValue = `:value${i}`;

    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = marshall({ [key]: data[key] })[key];
  });

  const updateExpression = `SET ${updateExpressions.join(", ")}`;

  try {
    await ddbClient.send(
      new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          itemType: { S: "game" },
          itemId: { S: gameId },
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Game updated successfully" }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating game", error: err.message }),
    };
  }
};
