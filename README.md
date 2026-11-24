# Our Museum

A small 3D gallery you can walk through and look at your photos.

## Add your photos
1. Copy your pictures into the `photos` folder (jpg / png / webp).
2. Open `photos.js` and add one line per photo: file name, title, date, and an optional note.
   You can add as many as you like; the hall gets longer on its own.
3. Optional: put a song in a `music` folder and set `music: "music/song.mp3"`.

A frame whose file is missing shows a placeholder that tells you which file name it expects.

## Open it
Double-click `start.bat`, or run `node server.js` and open http://localhost:8765.
(Opening `index.html` directly doesn't work, because browsers block loading the photos from a plain file.)

## Controls
- Computer: WASD / arrow keys to walk, mouse to look, Shift to go faster, click or E on a photo to look closer, Esc to pause, M for music.
- Phone: left thumb to walk, right thumb to look, tap a photo.

## Share it with her
It's a plain static site, so you can put the folder on GitHub Pages or Netlify (drag and drop the folder)
and send the link. It works on phones too.
