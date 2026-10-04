// Sends the PNG + zip from render.js to one person on Slack, as a DM.
//
//   node send.js '<json line from render.js>'
//
// env SLACK_TOKEN   xoxp-… (user token: posts as you) or xoxb-… (bot token)
//                   scopes: files:write, im:write
//     SLACK_TO      member ID of the recipient, e.g. U04ABCDEF (Mathis)
//     SLACK_MESSAGE optional, {range} and {theme} are filled in
// Without SLACK_TOKEN it only prints what it would send.

const fs = require('fs');
const path = require('path');

const API = 'https://slack.com/api/';
const token = process.env.SLACK_TOKEN;
const to = process.env.SLACK_TO;

async function slack(method, body) {
  const res = await fetch(API + method, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.error}${json.needed ? ' (needs ' + json.needed + ')' : ''}`);
  return json;
}

// Slack's upload flow: ask for an upload URL, POST the bytes there, then
// "complete" every file in one call so they land as a single message.
async function upload(file) {
  const bytes = fs.readFileSync(file);
  const filename = path.basename(file);
  const params = new URLSearchParams({ filename, length: String(bytes.length) });
  const res = await fetch(API + 'files.getUploadURLExternal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const ticket = await res.json();
  if (!ticket.ok) throw new Error(`files.getUploadURLExternal: ${ticket.error}`);
  const form = new FormData();
  form.append('file', new Blob([bytes]), filename);
  const put = await fetch(ticket.upload_url, { method: 'POST', body: form });
  if (!put.ok) throw new Error(`upload of ${filename} failed: HTTP ${put.status}`);
  return { id: ticket.file_id, title: filename };
}

async function main() {
  const r = JSON.parse(process.argv[2]);
  const range = r.name.replace(/^Weekly Wager Race - /, '').replace(/\.png$/i, '');
  const message = (process.env.SLACK_MESSAGE || 'Weekly race card for {range}')
    .replace('{range}', range).replace('{theme}', r.themeName);
  const files = [r.png, r.zip];

  if (!token || !to) {
    if (process.env.CI) throw new Error('SLACK_TOKEN secret or SLACK_TO variable is not set on the repo');
    console.log('[dry run] would DM', to || '(SLACK_TO unset)', '→', JSON.stringify(message));
    for (const f of files) console.log('  +', path.basename(f), fs.statSync(f).size, 'bytes');
    return;
  }
  const { channel } = await slack('conversations.open', { users: to });
  const uploaded = [];
  for (const f of files) uploaded.push(await upload(f));
  await slack('files.completeUploadExternal', { files: uploaded, channel_id: channel.id, initial_comment: message });
  console.log(`Sent ${uploaded.map(u => u.title).join(' + ')} to ${to}`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
