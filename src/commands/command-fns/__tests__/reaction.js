const {setupServer} = require('msw/node')
const {rest} = require('msw')
const reaction = require('../reaction')

const server = setupServer(
  rest.get('https://api.giphy.com/v1/gifs/search', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            url:
              'https://giphy.com/gifs/pixel-art-woodblock-utagawa-kuniyoshi-l41lGWOH4zS1MkmCQ',
          },
        ],
      }),
    )
  }),
)

server.listen()

test('should get kcd reaction', async () => {
  const send = jest.fn(() => Promise.resolve())
  const message = {content: '?reaction yes', channel: {send}}
  await reaction(message)
  expect(send).toHaveBeenCalledWith(
    'https://giphy.com/gifs/pixel-art-woodblock-utagawa-kuniyoshi-l41lGWOH4zS1MkmCQ',
  )
})
