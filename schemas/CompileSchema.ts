import { JSONSchema4 } from 'json-schema'

const CompileSchema: JSONSchema4 = {
  type: 'object',
  properties: {
    circuitId: {
      type: 'string',
    },
    variables: {
      type: 'object',
    },
    inputs: {
      type: 'object',
    },
  },
  required: ['circuitId', 'variables', 'inputs'],
}

export default CompileSchema
