'use strict'
const util = require('util')
const logger = require('pino')()

const { RTMClient } = require('@slack/rtm-api');

module.exports = {
  connectToSlackRTMAsync: async function (token) {

    // The client is initialized and then started to get an active connection to the platform
    const rtm = new RTMClient(token);
    await rtm.start()

    rtm.on('disconnecting', (event) => {
      // The argument is the event as shown in the reference docs.
      // For example, https://api.slack.com/events/user_typing
      logger.info("disconnecting:" + util.inspect(event));
    })

    rtm.on('disconnected', (event) => {
      // The argument is the event as shown in the reference docs.
      // For example, https://api.slack.com/events/user_typing
      logger.info("disconnected:" + util.inspect(event));
    })

    // Calling `rtm.on(eventName, eventHandler)` allows you to handle events (see: https://api.slack.com/events)
    // When the connection is active, the 'ready' event will be triggered
    rtm.on('ready', async () => {

      try {
        // Sending a message requires a channel ID, a DM ID, an MPDM ID, or a group ID
        // The following value is used as an example
        const conversationId = 'C7F9N62KS'

        // The RTM client can send simple string messages
        const res = await rtm.sendMessage('Hello there', conversationId);

        // `res` contains information about the sent message
        logger.info('Message sent: ' + util.inspect(res));
      }
      catch (error) {
        logger.error("Error in Slack RTM API: " + error.stack)
      }
    });

    rtm.on('message', (event) => {
      logger.info(event);
    });
  }

}