import {
    DynamoDBClient,
    GetItemCommand,
    UpdateItemCommand,
  } from "@aws-sdk/client-dynamodb";
  import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
  import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
  import { unmarshall } from "@aws-sdk/util-dynamodb";
  
  const ddbClient = new DynamoDBClient({});
  const translateClient = new TranslateClient({});
  
  export const handler = async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    const gameIdRaw = event.pathParameters?.gameId;
    const language = event.queryStringParameters?.language;
  
    if (!gameIdRaw || !language) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing required parameters: gameId or language",
        }),
      };
    }
  
  
    const gameId = `game#${gameIdRaw}`;
    const itemType = "game";
  
    try {

      const getResult = await ddbClient.send(
        new GetItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            itemType: { S: itemType },
            itemId: { S: gameId },
          },
        })
      );
  
      if (!getResult.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Game not found" }),
        };
      }
  
      const game = unmarshall(getResult.Item);
      const cacheAttrName = `overview_${language}`;
  
   
      if (game[cacheAttrName]) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            translated: game[cacheAttrName],
            cached: true,
          }),
        };
      }
  
 
      const translateCommand = new TranslateTextCommand({
        Text: game.overview,
        SourceLanguageCode: "en",
        TargetLanguageCode: language,
      });
  
      const translateResult = await translateClient.send(translateCommand);
      const translatedText = translateResult.TranslatedText || "";
  

      await ddbClient.send(
        new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            itemType: { S: itemType },
            itemId: { S: gameId },
          },
          UpdateExpression: `SET #translated = :text`,
          ExpressionAttributeNames: {
            "#translated": cacheAttrName,
          },
          ExpressionAttributeValues: {
            ":text": { S: translatedText },
          },
        })
      );
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          translated: translatedText,
          cached: false,
        }),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error during translation",
          error: err.message,
        }),
      };
    }
  };
  