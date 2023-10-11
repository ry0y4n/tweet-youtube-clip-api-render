const fs = require('fs');
const express = require("express");
const cors = require('cors');
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 0;
const YTDlpWrap = require('yt-dlp-wrap');
const { TwitterApi, EUploadMimeType } = require('twitter-api-v2');

const secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));

const app = express();
app.use(cors());
const port = process.env.PORT || 3001;

app.get("/", (req, res) => res.status(200).json({ message: '見つかっちゃった' }));

app.get("/auth", async (req, res) => {
  console.log("[/auth]");
  const client = new TwitterApi({
    appKey: secrets["appKey"],
    appSecret: secrets["appSecret"],
  });

  const authLink = await client.generateAuthLink('chrome-extension://ckoccjejljagejofogkcgbmameopconk/auth_callback.html', {
    authAccessType: 'write'
  });

  console.log(`Authentication Page URL: ${authLink.url}`);
  res.status(200).json({
    url: authLink.url,
    oauth_token_secret: authLink.oauth_token_secret,
  });
});

app.get("/login", (req, res) => {
  console.log("[/login]");
  if (!req.query.oauth_token || !req.query.oauth_verifier || !req.query.oauth_token_secret) {
    res.status(400).json({ message: 'Please pass a oauth_token, oauth_verifier, oauth_token_secret on the query string or in the request body' });
  }

  const client = new TwitterApi({
    appKey: secrets["appKey"],
    appSecret: secrets["appSecret"],
    accessToken: req.query.oauth_token,
    accessSecret: req.query.oauth_token_secret
  });

  client.login(req.query.oauth_verifier)
    .then(async ({ client: loggedClient, accessToken, accessSecret }) => {
      res.status(200).json({ accessToken: accessToken, accessSecret: accessSecret });
    })
    .catch((err) => {
      res.status(500).json({ message: 'Failed Login: ' + err.message });
    });
});

app.get("/post", async (req, res) => {
  console.log("[/post]");
  // もしURLが無かったら早々にresponseを返す
  if (!req.query.url) {
    res.status(400).json({ message: 'Please pass a url on the query string or in the request body' });
    return;
  }
  // もしaccessTokenとaccessSecretが無かったら早々にresponseを返す
  if (!req.query.accessToken || !req.query.accessSecret) {
    res.status(400).json({ message: 'Please pass a accessToken, accessSecret on the query string or in the request body' });
  }
  const url = req.query.url;
  console.log(`Video URL: ${url}`);
  const client = new TwitterApi({
    appKey: secrets["appKey"],
    appSecret: secrets["appSecret"],
    accessToken: req.query.accessToken,
    accessSecret: req.query.accessSecret
  });

  console.dir(`Client: ${client}`, { depth: null });

  try {
    const ytDlpWrap = new YTDlpWrap.default('./yt-dlp');

    const { title } = await ytDlpWrap.getVideoInfo(url);
    console.log(`Video Title: ${title}`);
    const readableStream = ytDlpWrap.execStream([
      url,
      '-f',
      'best[ext=mp4]',
    ]);

    const chunks = [];

    await new Promise((resolve, reject) => {
      readableStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      readableStream.on('end', async () => {
        try {
          console.log('Stream ended, concatenating chunks');
          const data = Buffer.concat(chunks);
          await tweetClip(client, data, title, url);
          res.status(200).json({ message: 'Tweeted successfully' });
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      readableStream.on('error', (err) => {
        console.log('Error occurred:', err.message);
        res.status(500).json({ message: 'An error occurred: ' + err.message });
        reject(err);
      });
    });
  } catch(err) {
    console.log('Error in tweetClip:', err.message);
    res.status(500).json({ message: 'An error occurred: ' + err.message });
  }
});

async function tweetClip(client, data, title, url) {
  console.log('Uploading media');
  const mediaId = await client.v1.uploadMedia(data, {
    mimeType: EUploadMimeType.Mp4,
    longVideo: true
  });
  console.log(`Media Id: ${mediaId}`);
  console.log('Tweeting');
  await client.v2.tweet({
    text: `${title} ${url} @YouTubeより`,
    media: { media_ids: [mediaId] }
  });
  console.log('Tweeted');
}

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

server.keepAliveTimeout = 180 * 1000;
server.headersTimeout = 180 * 1000;
