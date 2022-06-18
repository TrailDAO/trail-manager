import { JSONSchema4 } from 'json-schema'

const DeploymentSchema: JSONSchema4 = {
  type: 'object',
  properties: {
    transactionHash: {
      type: 'string',
    },
    contractAddress: {
      type: 'string',
    },
    chainId: {
      type: 'number',
    },
  },
  required: ['transactionHash', 'contractAddress', 'chainId'],
}

export default DeploymentSchema
