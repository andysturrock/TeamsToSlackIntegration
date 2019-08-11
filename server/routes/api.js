'use strict'
const express = require('express');
const router = express.Router();
const logger = require('pino')()
const createError = require('http-errors');
const util = require('util')
const channelMaps = require('../channel-maps')

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
    const channelMapping = req.body;
    const valid = channelMapping.team && channelMapping.team.id && channelMapping.team.name
      && channelMapping.teamsChannel && channelMapping.teamsChannel.id && channelMapping.teamsChannel.name
      && channelMapping.workspace && channelMapping.workspace.id && channelMapping.workspace.name
      && channelMapping.slackChannel && channelMapping.slackChannel.id && channelMapping.slackChannel.name
      && channelMapping.mappingOwner && channelMapping.mappingOwner.id && channelMapping.mappingOwner.name
      && channelMapping.mappingOwner.token;
    if (!valid) {
      logger.error("Missing fields in body", req.body)
      res.status(200).json({ error: 'One or more missing fields' });
    } else {
      await channelMaps.saveMapAsync(req.body)
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
    await channelMaps.deleteMapAsync(req.body)
    res.status(200).json({ result: 'success' });
  } catch (error) {
    logger.error(error)
    res.status(500).json(error);
  } finally {
    res.end();
  }
});

module.exports = router;