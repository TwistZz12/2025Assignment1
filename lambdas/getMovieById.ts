import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    
    if (!movieId) {
      return {
        statusCode: 400, 
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid movieId" }),
      };
    }

    const queryParams = event.queryStringParameters || {};
    const includeCast = queryParams.cast === "true";

    const commandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );

    console.log("GetCommand response: ", commandOutput);

    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid movie Id" }),
      };
    }

    let responseBody = { ...commandOutput.Item };

    if (includeCast) {
      responseBody.cast = getMovieCast(movieId);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(responseBody),
    };
  } catch (error: any) {
    console.error("[ERROR]", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Failed to fetch movie" }),
    };
  }
};

function getMovieCast(movieId: number) {
  const castData: Record<string, string[]> = {
    1234: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
    2345: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
  };
  return castData[String(movieId)] || [];
}


function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
