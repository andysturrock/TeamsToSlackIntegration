'use strict'
const express = require('express');
const router = express.Router();
const logger = require('pino')()
const createError = require('http-errors');
const util = require('util')
const channelMaps = require('../channel-maps')
const tokens = require('../oauth/tokens.js');
const SlackToTeamsMapping = require('../slack-to-teams-mapping')
const TeamsToSlackMapping = require('../teams-to-slack-mapping')
const ChannelMapping = require('../channel-mapping')

router.get('/', async function (req, res) {
  // TODO check that the oauth token is
  // valid and matches the user in the mapping
  // if (!req.isAuthenticated()) {
  //   res.send(createError(401));
  //   return;
  // }

  try {
    const mappings = await channelMaps.getMapsAsync()
    res.json(mappings);
  } catch (error) {
    logger.error(error)
    res.status(500).json(error);
  } finally {
    res.end();
  }
});

router.post('/', async function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  // TODO check that the oauth token is
  // valid and matches the user in the mapping

  // if (!req.isAuthenticated()) {
  //   res.send(createError(401));
  // }

  try {
    // Check all the fields are present.  Should be:
    // team: { id: string, name: string };
    // teamsChannel: { id: string, name: string };
    // workspace: { id: string, name: string };
    // slackChannel: {id: string, name: string};
    // mappingOwner: {id: string, name: string, token: string};
    const channelMapping = new ChannelMapping(req.body)
    if (!channelMapping.isValid()) {
      logger.error("Missing fields in body", req.body)
      res.status(200).json({ error: 'One or more missing fields' });
    } else {
      // Get the on-behalf-of token
      const onBehalfOfToken = await tokens.getOnBehalfOfTokenAsync(channelMapping.mappingOwner.token)
      channelMapping.mappingOwner.token = onBehalfOfToken
      await channelMaps.saveMapAsync(channelMapping)
      // These registers themselves, so don't need to hang on to the references here.
      const slackToTeamsMapping = new SlackToTeamsMapping(channelMapping)
      await slackToTeamsMapping.initAsync()

      const teamsToSlackMapping = new TeamsToSlackMapping(channelMapping)
      await teamsToSlackMapping.initAsync()

      res.status(200).json({ result: 'success' });
    }
  } catch (error) {
    logger.error(error)
    res.status(500).json(error);
  } finally {
    res.end();
  }
});

router.delete('/', async function (req, res) {
  // TODO check that the oauth token is
  // valid and matches the user in the mapping
  // if (!req.isAuthenticated()) {
  //   res.send(createError(401));
  //   return;
  // }

  try {
    const channelMapping = new ChannelMapping(req.body)
    if (!channelMapping.isValid()) {
      logger.error("Missing fields in body", req.body)
      res.status(200).json({ error: 'One or more missing fields' })
    }
    await channelMaps.deleteMapAsync(channelMapping)

    const slackToTeamsMapping = SlackToTeamsMapping.getMapping(channelMapping)
    slackToTeamsMapping.destroy()

    const teamsToSlackMapping = TeamsToSlackMapping.getMapping(channelMapping)
    teamsToSlackMapping.destroy()

    res.status(200).json({ result: 'success' });
  } catch (error) {
    logger.error(error)
    res.status(500).json(error);
  } finally {
    res.end();
  }
});

module.exports = router;