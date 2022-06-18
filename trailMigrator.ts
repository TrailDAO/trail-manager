import axios from 'axios'
import * as cheerio from 'cheerio'
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'fs'
import getBoundsOfTrail from './getBoundsOfTrail'

async function migrateTrails() {
  if (!existsSync('trailList.data')) {
    const res = await axios.get('https://www.nrtdatabase.org/trailList.php?usrTrailName=&usrTrailSystem=&usrTrailState=&usrTrailCounty=&usrTrailLength=0&usrTrailUse=&usrTrailUse2=&usrAgency=&usrYearDesignated=&btnDetailedSearch=Search+the+Database')
    writeFileSync('trailList.data', res.data)
  }

  if (!existsSync('trailListTemp')) {
    mkdirSync('trailListTemp')
  }

  const trailList = readFileSync('trailList.data')
  const $ = cheerio.load(trailList)
  const trails = $('.trailListText a')

  let numNames = 0
  let numShortDescriptions = 0
  let numLongDescriptions = 0
  let validTrails = 0

  for (let i = 0; i < trails.length; i += 1) {
    const link = trails[i].attribs.href
    if (!existsSync(`trailListTemp/${link}`)) {
      // eslint-disable-next-line no-await-in-loop
      const res = await axios.get(`https://www.nrtdatabase.org/${link}`)
      writeFileSync(`trailListTemp/${link}`, res.data)
    }

    const trailHtml = readFileSync(`trailListTemp/${link}`)
    const $2 = cheerio.load(trailHtml)
    const name = $2('#one div.container header h2').text()
    if (name) numNames += 1
    const shortDescription = $2('#one > div.container > header > p:nth-child(8) > span').text()
    if (shortDescription) numShortDescriptions += 1
    const longDescription = $2('#three > div > p:nth-child(3)').text()
    if (longDescription) numLongDescriptions += 1
    const details = $2('#two > div > p:nth-child(3)').text()
    // pull out location string, state(s), counties, and Longitude Latitude
    let detailsArray = details.split('\n')
    detailsArray = detailsArray.map((detail) => detail.trim())
    detailsArray = detailsArray.filter((detail) => detail !== '')
    const offset = detailsArray.length - 4
    if (offset > 0) {
      detailsArray[0] = detailsArray.slice(0, offset + 1).join(' ')
    }
    validTrails += 1
    const location = detailsArray[0].split(':')[1].trim()
    let state = detailsArray[1 + offset].split(':')[1]
    if (state) {
      state = state.trim()
    } else {
      // fix for stavich bike trail
      state = 'Ohio, Pennsylvania'
    }
    const counties = detailsArray[2 + offset].split(':')[1].trim()
    const longitudeLatitude = detailsArray[3 + offset].split(':')
    const longitude = longitudeLatitude[1].replace('Latitude', '').trim()
    const latitude = longitudeLatitude[2].trim()

    const bounds = getBoundsOfTrail(latitude, longitude)

    const trail = {
      name,
      location,
      latitude,
      longitude,
      bounds,
      state,
      counties,
      shortDescription,
      longDescription,
    }

    writeFileSync(`trailListTemp/${link}.json`, JSON.stringify(trail))
  }

  console.log('Number of valid trails', validTrails)
  console.log('Number of valid names', numNames)
  console.log('Number of valid short descriptions', numShortDescriptions)
  console.log('Number of valid long descriptions', numLongDescriptions)

  // parse out necessary data and write a json object that can be uploaded later
}

migrateTrails().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

// crawl nrtdatabase website
// call trailmix-manager api and create location
// status becomes trail created, compiled, and deployed

// create api calls to search for trails nearest your current location
// sort by lat / long and try filters by post calculated distance

// also need a migrator for pulling stuff off of americantrails.org
// nrt database
