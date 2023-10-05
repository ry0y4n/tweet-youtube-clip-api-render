const fs = require('fs');
const express = require("express");
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 20;
const YTDlpWrap = require('yt-dlp-wrap');
const { TwitterApi, EUploadMimeType } = require('twitter-api-v2');
const app = express();
const port = process.env.PORT || 3001;

const secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));

const client = new TwitterApi({
  appKey: secrets["appKey"],
  appSecret: secrets["appSecret"],
  accessToken: secrets["accessToken"],
  accessSecret: secrets["accessSecret"]
});

app.get("/", (req, res) => res.status(200).json({ message: '見つかっちゃった' }));

app.get("/post", async (req, res) => {
  // もしURLが無かったら早々にresponseを返す
  if (!req.query.url) {
    res.status(400).json({ message: 'Please pass a url on the query string or in the request body' });
    return;
  }
  const url = req.query.url;

  try {
    const ytDlpWrap = new YTDlpWrap.default('./yt-dlp');

    const { title } = await ytDlpWrap.getVideoInfo(url);
    console.log(title);
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
          await tweetClip(data, title, url);
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

async function tweetClip(data, title, url) {
  console.log('Uploading media');
  const mediaId = await client.v1.uploadMedia(data, {
    mimeType: EUploadMimeType.Mp4,
    longVideo: true
  });
  console.log(mediaId);
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
