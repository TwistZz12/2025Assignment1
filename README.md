## Serverless REST Assignment - Distributed Systems.

__Name:__  MingHao Meng

__Demo:__ https://youtu.be/JanHdZTn_2A

### Context.

State the context you chose for your web API and detail the attributes of the DynamoDB table items, e.g.

Context: Game Management System

Table item attributes:
+ itemType - string (Partition key, constant value "game")
+ itemId - string (Sort key, format: "game#UUID")
+ title - string
+ overview - string
+ rating - number
+ visible - boolean
+ overview_xx - string (translated overview in language 'xx', e.g. overview_fr for French)

### App API endpoints.

+ POST /games - Add a new game (protected by API key)
+ GET /games - Get all games
+ GET /games/{gameId} - Get a specific game by ID
+ GET /games/{gameId}/translation?language=xx - Get the translated overview of a game
+ PUT /games/{gameId} - Update an existing game (protected by API key)
+ PATCH /games/{gameId} - Partially update a game (protected by API key)
+ DELETE /games/{gameId} - Delete a specific game
+ DELETE /games - Delete all games
+ GET /games?visible=true - Query games using query string filters (e.g., by visibility)


### Features.

#### Translation persistence (if completed)

Amazon Translate is used to translate the `overview` field of a game into a target language. Translations are cached back into DynamoDB under attributes like `overview_fr` or `overview_zh`. Future translation requests for the same language are served from DynamoDB to reduce cost.

{
    "translated": "Un RPG fantastique épique dans lequel les joueurs explorent des ruines antiques et affrontent des créatures mythiques.",
    "cached": true
}

#### Custom L2 Construct (if completed)

Not implemented in this project.

#### Multi-Stack app (if completed)

Not implemented in this project.

#### Lambda Layers (if completed)

Not implemented in this project.


#### API Keys. (if completed)

API Key authentication was implemented using the AWS API Gateway and configured with the AWS CDK. A usage plan was created and bound to a manually defined API key. The protected endpoints require clients to pass the API key in the x-api-key header to gain access.

The following code excerpts from rest-api-stack.ts show how the API key and usage plan were configured:

~~~ts
// This is a code excerpt markdown 
// Create a raw API key
const rawApiKey = new apig.CfnApiKey(this, "AssignmentRawApiKey", {
  enabled: true,
  name: "AssignmentAPIKey",
  value: "my-secret-api-key-2025", 
});

// Create usage plan and associate the API
const usagePlan = new apig.UsagePlan(this, "AssignmentUsagePlan", {
  name: "AssignmentUsagePlan",
  apiStages: [{
    api,
    stage: api.deploymentStage,
  }],
});

// Bind the API key to the usage plan
new apig.CfnUsagePlanKey(this, "AssignmentUsagePlanKey", {
  keyId: rawApiKey.ref,
  keyType: "API_KEY",
  usagePlanId: usagePlan.usagePlanId,
});

~~~
To protect specific endpoints (e.g. POST /games, PUT /games/{gameId}), the apiKeyRequired: true option was added to the corresponding method:
~~~ts
gamesEndpoint.addMethod(
  "POST",
  new apig.LambdaIntegration(addGameFn, { proxy: true }),
  { apiKeyRequired: true }
);

specificGameEndpoint.addMethod(
  "PUT",
  new apig.LambdaIntegration(updateGameFn, { proxy: true }),
  { apiKeyRequired: true }
);

~~~
This ensures that only requests with the correct API key in the x-api-key header will be accepted for these operations.




