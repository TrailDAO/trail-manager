# Trail Manager

## Running locally
```SERVICES="dynamodb,s3,sqs" localstack start```
```yarn start```

### Create compile requests queue
```awslocal sqs create-queue --queue-name compile-requests```

Add queue url to .env

### Adding a circuit template to dynamodb
ts-node addCircomCircuit.ts ./circuits/LocationMetadata.json ./circuits/LocationTemplate.circom

### Running queue consumer
ts-node queueConsumer.ts
