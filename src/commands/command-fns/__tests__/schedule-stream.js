const Discord = require('discord.js')
const {rest} = require('msw')
const {SnowflakeUtil} = require('discord.js')
const {makeFakeClient} = require('test-utils')
const {server} = require('server')
const scheduleStream = require('../schedule-stream')
const {getRole} = require('../../utils')
const {cleanup} = require('../../../schedule-stream/cleanup')

async function setup() {
  const {client, defaultChannels, kody, guild} = await makeFakeClient()

  const createMessage = (content, user) => {
    return new Discord.Message(
      client,
      {
        id: SnowflakeUtil.generate(),
        content,
        author: user,
      },
      defaultChannels.talkToBotsChannel,
    )
  }

  const getBotMessages = () =>
    Array.from(defaultChannels.talkToBotsChannel.messages.cache.values())
  const getStreamerMessages = () =>
    Array.from(defaultChannels.streamerChannel.messages.cache.values())

  const streamerRole = getRole(guild, {name: 'Streamer'})

  return {
    guild,
    getBotMessages,
    getStreamerMessages,
    kody,
    botChannel: defaultChannels.talkToBotsChannel,
    streamerChannel: defaultChannels.streamerChannel,
    streamerRole,
    createMessage,
  }
}

test('should schedule a new stream', async () => {
  const {kody, streamerRole, createMessage, getStreamerMessages} = await setup()

  await kody.roles.add(streamerRole)
  await scheduleStream(
    createMessage(
      `?schedule-stream "Migrating to Tailwind" on January 20th from 3:00 PM - 8:00 PM MDT`,
      kody.user,
    ),
  )
  const messages = getStreamerMessages()
  expect(messages).toHaveLength(1)
  expect(messages[0].content).toEqual(
    `📣 On January 20th from 3:00 PM - 8:00 PM MDT <@!${kody.id}> will be live streaming "Migrating to Tailwind". React with ✋ to be notified when the time arrives.`,
  )
})

test('should show an error message when a general user tries to create a schedule', async () => {
  const {getBotMessages, createMessage, kody} = await setup()

  await scheduleStream(
    createMessage(
      `?schedule-stream "Migrating to Tailwind" on January 20th from 3:00 PM - 8:00 PM MDT`,
      kody.user,
    ),
  )

  const messages = getBotMessages()
  expect(messages).toHaveLength(1)
  expect(messages[0].content).toEqual(
    'Sorry but this command is only available for streamers.',
  )
})

test('should give an error if the message is malformed', async () => {
  const {getBotMessages, createMessage, kody, streamerRole} = await setup()

  await kody.roles.add(streamerRole)
  await scheduleStream(
    createMessage(`?schedule-stream "Migrating to Tailwind"`, kody.user),
  )

  const messages = getBotMessages()
  expect(messages).toHaveLength(1)
  expect(messages[0].content).toEqual(
    'The command is not valid. use `?schedule-stream help` to know more about the command.',
  )
})

test('should give an error if the message contains an invalid time', async () => {
  const {kody, streamerRole, createMessage, getBotMessages} = await setup()

  await kody.roles.add(streamerRole)
  await scheduleStream(
    createMessage(
      `?schedule-stream "Migrating to Tailwind" on January 32th from 3:00 PM - 8:00 PM MDT`,
      kody.user,
    ),
  )

  const messages = getBotMessages()
  expect(messages).toHaveLength(1)
  expect(messages[0].content).toEqual(
    'The command is not valid. use `?schedule-stream help` to know more about the command.',
  )
})

test('should send a message to all users that reacted to the message and delete it then', async () => {
  jest.useFakeTimers('modern')

  const {
    guild,
    kody,
    streamerRole,
    createMessage,
    getStreamerMessages,
  } = await setup()

  const eventTime = new Date()
  eventTime.setMinutes(eventTime.getMinutes() + 30)
  await kody.roles.add(streamerRole)
  await scheduleStream(
    createMessage(
      `?schedule-stream "Migrating to Tailwind" on ${eventTime.toISOString()}`,
      kody.user,
    ),
  )

  expect(getStreamerMessages()).toHaveLength(1)
  let dmMessage = ''
  server.use(
    rest.get(
      '*/api/:apiVersion/channels/:channelId/messages/:messageId/reactions/:reaction',
      (req, res, ctx) => {
        return res(ctx.json([kody.user]))
      },
    ),
    rest.post(
      '*/api/:apiVersion/channels/:channelId/messages',
      (req, res, ctx) => {
        dmMessage = req.body.content
        return res(ctx.status(201), ctx.json({}))
      },
    ),
  )

  jest.advanceTimersByTime(1000 * 60 * 10)
  await cleanup(guild)
  expect(getStreamerMessages()).toHaveLength(1)

  jest.advanceTimersByTime(1000 * 60 * 21)
  await cleanup(guild)
  expect(getStreamerMessages()).toHaveLength(0)
  expect(dmMessage).toEqual(`Hey, <@${kody.id}> is going to stream!!`)
})
