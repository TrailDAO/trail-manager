import { JSONSchema4 } from 'json-schema'

const TrailSchema: JSONSchema4 = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    location: {
      type: 'string',
    },
    latitude: {
      type: 'string',
    },
    longitude: {
      type: 'string',
    },
    bounds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          latitude: {
            type: 'number',
          },
          longitude: {
            type: 'number',
          },
        },
      },
    },
    state: {
      type: 'string',
    },
    counties: {
      type: 'string',
    },
    shortDescription: {
      type: 'string',
    },
    longDescription: {
      type: 'string',
    },
  },
}

export default TrailSchema
