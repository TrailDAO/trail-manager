import getBoundsOfDistance from 'geolib/es/getBoundsOfDistance'

function getBoundsOfTrail(lat: string, lon: string) {
  return getBoundsOfDistance({ lat, lon }, 1000)
}

export default getBoundsOfTrail
