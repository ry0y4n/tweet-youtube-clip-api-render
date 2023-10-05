const fs = require('fs');
const express = require("express");
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

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Hello from Render!</title>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    <script>
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      }, 500);
    </script>
    <style>
      @import url("https://p.typekit.net/p.css?s=1&k=vnd5zic&ht=tk&f=39475.39476.39477.39478.39479.39480.39481.39482&a=18673890&app=typekit&e=css");
      @font-face {
        font-family: "neo-sans";
        src: url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/d?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/a?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("opentype");
        font-style: normal;
        font-weight: 700;
      }
      html {
        font-family: neo-sans;
        font-weight: 700;
        font-size: calc(62rem / 16);
      }
      body {
        background: white;
      }
      section {
        border-radius: 1em;
        padding: 1em;
        position: absolute;
        top: 50%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%);
      }
    </style>
  </head>
  <body>
    <section>
      Hello from Render!
    </section>
  </body>
</html>
`
