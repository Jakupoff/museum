# Our Museum

A small 3D gallery you can walk through and look at your photos.

## Add your photos
1. Copy your pictures into the `photos` folder (jpg / png / webp).
2. Open `photos.js` and add one line per photo: file name, title, date, and an optional note.
   You can add as many as you like; the hall gets longer on its own.
3. Optional: put a song in a `music` folder and set `music: "music/song.mp3"`.

A frame whose file is missing shows a placeholder that tells you which file name it expects.

## Run it from the laptop (with photo uploads)
1. Start Docker Desktop.
2. Double-click `start.bat`. It starts the museum and prints a public link like
   `https://something.trycloudflare.com`. Send that link to her; it works on iPhone.
3. In the museum, tap any frame to add or change its photo, title, date and note.
   The empty frame with a **+** at the end adds a new photo, and the hall grows.
   The first time, it asks for the museum password (it's in the `.env` file).

Photos added this way are saved on the laptop in `data/` (not on GitHub).
The link works only while the laptop is on and Docker is running, and it changes every time the containers restart.
Stop everything with `docker compose down`.

Without Docker: `node server.js`, then open http://localhost:8765.

The GitHub Pages copy (https://jakupoff.github.io/museum/) can't save uploads; it only shows the photos listed in `photos.js`.

## Controls
- Computer: WASD / arrow keys to walk, mouse to look, Shift to go faster, click or E on a photo to look closer, Esc to pause, M for music.
- Phone: left thumb to walk, right thumb to look, tap a photo.

## Visit together
1. Both type your names on the start screen.
2. One of you clicks **Visit together** and gets a code like `ROSE-42`.
3. The other types that code and clicks **Join**.

You then see each other walking in the museum, and get a little note when the other opens a photo.
It connects your two devices directly (WebRTC via the free PeerJS service), with no server of your own.
On some mobile networks a direct connection isn't possible; if joining fails, try Wi-Fi.

## Share it with her
It's a plain static site, so you can put the folder on GitHub Pages or Netlify (drag and drop the folder)
and send the link. It works on phones too.
