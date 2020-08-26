// Command purpose:
// this command help the user to search KCD reaction gifs on giphy
const GphApiClient = require('giphy-js-sdk-core')
const {getArgs} = require('../command-regex')

const client = new GphApiClient(process.env.GIPHY_KEY)

async function reaction(message) {
  const args = getArgs(message.content)
  let result
  const tags = args
    .trim()
    .split(' ')
    .map(tag => `${tag}`)
    .join(' ')
  const {data: gifs} = await client.search('gifs', {
    q: `@kentcdodds ${tags}`,
  })
  if (gifs.length > 0) {
    result = await message.channel.send(gifs[0].url)
  } else {
    result = await message.channel.send(
      `No super-duper image found for tags ${tags}`,
    )
  }
  return result
}
reaction.description = 'Will search KCD reaction gifs'

module.exports = reaction
