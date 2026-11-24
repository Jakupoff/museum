// Museum server (no dependencies).
//   node server.js   ->  http://localhost:8765
// Serves the museum and stores photos added from the site in DATA_DIR (default ./data).
// Set MUSEUM_PASSWORD to require a password for adding/changing photos.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8765;
const ROOT = __dirname;
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOADS = path.join(DATA, 'uploads');
const SLOTS_FILE = path.join(DATA, 'slots.json');
const PASSWORD = process.env.MUSEUM_PASSWORD || '';
const MAX_SLOT = 300;
const MAX_BODY = 25 * 1024 * 1024;

fs.mkdirSync(UPLOADS, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.md': 'text/plain; charset=utf-8',
};

function loadSlots() {
  try { return JSON.parse(fs.readFileSync(SLOTS_FILE, 'utf8')); } catch { return {}; }
}
function saveSlots(slots) {
  const tmp = SLOTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(slots, null, 2));
  fs.renameSync(tmp, SLOTS_FILE);
}
let slots = loadSlots();

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function authorized(req) {
  if (!PASSWORD) return true;
  const given = Buffer.from(String(req.headers['x-museum-password'] || ''));
  const want = Buffer.from(PASSWORD);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too big')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const clean = (v, n) => String(v || '').slice(0, n);
function removeUpload(slot) {
  if (slot && slot.src && slot.src.startsWith('uploads/')) {
    fs.rm(path.join(UPLOADS, path.basename(slot.src)), () => {});
  }
}

async function api(req, res, p) {
  if (p === '/api/state' && req.method === 'GET') {
    return json(res, 200, { upload: true, passwordRequired: !!PASSWORD, slots });
  }
  if (p === '/api/check' && req.method === 'POST') {
    return json(res, authorized(req) ? 200 : 401, { ok: authorized(req) });
  }
  const m = p.match(/^\/api\/slot\/(\d+)$/);
  if (!m) return json(res, 404, { error: 'not found' });
  const i = Number(m[1]);
  if (i < 0 || i > MAX_SLOT) return json(res, 400, { error: 'bad slot' });
  if (!authorized(req)) return json(res, 401, { error: 'wrong password' });

  if (req.method === 'DELETE') {
    removeUpload(slots[i]);
    delete slots[i]; saveSlots(slots);
    return json(res, 200, { ok: true, slots });
  }
  if (req.method === 'POST') {
    let body;
    try { body = JSON.parse((await readBody(req)).toString('utf8')); }
    catch { return json(res, 400, { error: 'bad request or photo too big' }); }
    const prev = slots[i] || {};
    const next = {
      src: prev.src || '',
      title: clean(body.title, 80), date: clean(body.date, 40), note: clean(body.note, 600),
      updated: Date.now(),
    };
    if (body.image) {
      const mm = String(body.image).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!mm) return json(res, 400, { error: 'unsupported image' });
      const ext = mm[1] === 'jpeg' ? 'jpg' : mm[1];
      const name = `${i}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS, name), Buffer.from(mm[2], 'base64'));
      removeUpload(prev);
      next.src = 'uploads/' + name;
    }
    slots[i] = next; saveSlots(slots);
    return json(res, 200, { ok: true, slots });
  }
  return json(res, 405, { error: 'method not allowed' });
}

http.createServer(async (req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end(); }
  if (p.startsWith('/api/')) {
    try { return await api(req, res, p); } catch (e) { return json(res, 500, { error: 'server error' }); }
  }
  if (p === '/') p = '/index.html';
  let file;
  if (p.startsWith('/uploads/')) file = path.join(UPLOADS, path.basename(p));
  else {
    file = path.join(ROOT, p);
    const rel = path.relative(ROOT, file);
    const hidden = rel.split(path.sep).some(part => part.startsWith('.'));
    const allowed = ['.html', '.js', '.css', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp3', '.m4a', '.ogg'].includes(path.extname(file).toLowerCase());
    if (!file.startsWith(ROOT + path.sep) || file.startsWith(DATA) || hidden || !allowed || rel === 'server.js') {
      res.writeHead(404); return res.end('not found');
    }
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': p.startsWith('/uploads/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Museum open at http://localhost:${PORT}${PASSWORD ? ' (password on)' : ''}`));
