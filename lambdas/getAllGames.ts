import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddbClient = new DynamoDBClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const visibleFilter = event.queryStringParameters?.visible;

  const params: any = {
    TableName: process.env.TABLE_NAME,
    FilterExpression: "#type = :game",
    ExpressionAttributeNames: {
      "#type": "itemType",
    },
    ExpressionAttributeValues: {
      ":game": { S: "game" },
    },
  };

  // Add filtering for visible if provided
  if (visibleFilter !== undefined) {
    params.FilterExpression += " AND #visible = :visible";
    params.ExpressionAttributeNames["#visible"] = "visible";
    params.ExpressionAttributeValues[":visible"] = {
      BOOL: visibleFilter === "true",
    };
  }

  try {
    const result = await ddbClient.send(new ScanCommand(params));
    const games = result.Items ? result.Items.map((item) => unmarshall(item)) : [];

    return {
      statusCode: 200,
      body: JSON.stringify({ games }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error fetching games", error: err.message }),
    };
  }
};
