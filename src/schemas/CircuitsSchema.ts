import { JSONSchema4 } from 'json-schema'

const CircuitsSchema: JSONSchema4 = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
    },
    lastKey: {
      type: 'object',
    },
  },
}

export default CircuitsSchema
