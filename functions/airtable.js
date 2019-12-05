const Airtable = require('airtable')

const ERROR_MSGS = {
  UNSUPPORTED_METHOD: 'Unsupported method',
  UNKNOWN_ERROR: 'Server Error',
}

exports.handler = async (event) => {
  try {
    const atClient = _configureAirtable()
    switch (event.httpMethod) {
      case 'POST':
        return await insertAttendee(atClient, event)
        break
      case 'GET':
        return await retrieveAttendees(atClient, event)
        break
      default:
        return {
          statusCode: 405,
          message: ERROR_MSGS.UNSUPPORTED_METHOD,
          body: ERROR_MSGS.UNSUPPORTED_METHOD,
        }
    }
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      body: ERROR_MSGS.UNKNOWN_ERROR,
    }
  }
}

async function retrieveAttendees(Client, event) {
  let attendees = []
  let selectOpts = {}
  const { eventId } = event.queryStringParameters
  if (eventId) {
    selectOpts = { filterByFormula: `SEARCH("${eventId}",{Event ID})` }
  }
  await Client('Attendees')
    .select(selectOpts)
    .eachPage((records, fetchNextPage) => {
      records.forEach(function(record) {
        attendees.push(record.fields)
      })
      fetchNextPage()
    })
  return {
    statusCode: 200,
    body: JSON.stringify(attendees),
  }
}

async function insertAttendee(Client, event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      message: ERROR_MSGS.UNSUPPORTED_METHOD,
      body: ERROR_MSGS.UNSUPPORTED_METHOD,
    }
  }
  const { eventId, name, username } = JSON.parse(event.body)
  await Client('Attendees').create([
    {
      fields: {
        Name: name,
        'Github Username': username,
        'Event ID': eventId,
        Type: 'Attendee',
        'Created Date': new Date().toISOString(),
      },
    },
  ])
  return {
    statusCode: 200,
    body: JSON.stringify({ name, eventId }),
  }
}

function _configureAirtable() {
  if (!process.env.AIRTABLE_BASE_ID) throw new Error('must set process.env.AIRTABLE_BASE_ID')
  if (!process.env.AIRTABLE_API_KEY) throw new Error('must set process.env.AIRTABLE_API_KEY')
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY })
  return Airtable.base(process.env.AIRTABLE_BASE_ID)
}
