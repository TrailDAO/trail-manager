import { JSONSchema4 } from 'json-schema'

const CompileSchema: JSONSchema4 = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    minLongitude: {
      type: 'string',
    },
    minLatitude: {
      type: 'string',
    },
    maxLongitude: {
      type: 'string',
    },
    maxLatitude: {
      type: 'string',
    },
  },
  required: ['name', 'minLongitude', 'minLatitude', 'maxLongitude', 'maxLatitude'],
}

export default CompileSchema
