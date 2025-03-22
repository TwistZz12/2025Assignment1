import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";

const ddbClient = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const data = await ddbClient.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME,
        FilterExpression: "itemType = :type",
        ExpressionAttributeValues: {
          ":type": { S: "game" },
        },
      })
    );

    const items = data.Items?.map((item) => unmarshall(item)) || [];

    return {
      statusCode: 200,
      body: JSON.stringify(items),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving games", error: err.message }),
    };
  }
};
