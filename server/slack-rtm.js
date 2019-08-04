function connectToSlackRTM() {


  const { RTMClient } = require('@slack/rtm-api');

  // An access token (from your Slack app or custom integration - usually xoxb)
  const token = process.env.SLACK_TOKEN;

  // The client is initialized and then started to get an active connection to the platform
  const rtm = new RTMClient(token);
  rtm.start()
    .catch(console.error);

  // Calling `rtm.on(eventName, eventHandler)` allows you to handle events (see: https://api.slack.com/events)
  // When the connection is active, the 'ready' event will be triggered
  rtm.on('ready', async () => {

    try {
      // Sending a message requires a channel ID, a DM ID, an MPDM ID, or a group ID
      // The following value is used as an example
      const conversationId = 'C1232456';

      // The RTM client can send simple string messages
      const res = await rtm.sendMessage('Hello there', conversationId);

      // `res` contains information about the sent message
      console.log('Message sent: ', res.ts);
    }
    catch (error) {
      console.log("Error in Slack RTM API: " + error.stack)
    }
  });

  // After the connection is open, your app will start receiving other events.
  rtm.on('user_typing', (event) => {
    // The argument is the event as shown in the reference docs.
    // For example, https://api.slack.com/events/user_typing
    console.log(event);
  })


}