/**
 * Weekly race card → Google Drive.
 *
 * Runs on Google's servers under your Google account, so no computer needs to be on.
 * Every Saturday at 09:00 and 10:00 (Bangkok), it copies the PNG + zip that the
 * GitHub job published to alexjackpot/weekly-race-bot/latest into a "Weekly race card"
 * folder. Last week's files move to its "Previous weeks" subfolder.
 *
 * Setup: paste this file into a new project at script.google.com, choose `setup`
 * in the toolbar, click Run and allow access. The log prints the folder link for
 * the Slack reminder. Running setup again is safe.
 */
const TZ = 'Asia/Bangkok';
const LATEST = 'https://raw.githubusercontent.com/alexjackpot/weekly-race-bot/main/latest/';
const FOLDER_NAME = 'Weekly race card';

function setup() {
  const folder = folder_();
  // Anyone with the link can view and download: Mathis doesn't need to sign in.
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  [9, 10].forEach(hour => ScriptApp.newTrigger('copyLatestCard').timeBased()
    .onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(hour).inTimezone(TZ).create());
  copyLatestCard(true);
  console.log('Folder for the Slack reminder: ' + folder.getUrl());
}

function copyLatestCard(force) {
  const info = JSON.parse(UrlFetchApp.fetch(LATEST + 'latest.json?t=' + Date.now()).getContentText());
  const folder = folder_();
  const names = [info.png, info.zip];
  if (names.every(n => folder.getFilesByName(n).hasNext())) return;   // already copied

  // GitHub still showing a week that has already started means its Saturday job
  // hasn't published yet. The 09:00 run waits for the 10:00 one; at 10:00 it fails,
  // and Google emails you.
  if (force !== true && info.week < nextMonday_()) {
    if (Number(Utilities.formatDate(new Date(), TZ, 'H')) < 10) return;
    throw new Error('GitHub still has ' + info.name + ': the Saturday job did not publish a new card.');
  }

  const files = names.map(n => {
    const res = UrlFetchApp.fetch(LATEST + encodeURIComponent(n));
    return res.getBlob().setName(n);
  });
  const archive = subfolder_(folder, 'Previous weeks');
  const old = folder.getFiles();
  while (old.hasNext()) old.next().moveTo(archive);
  files.forEach(blob => folder.createFile(blob));
}

// The folder setup() made, remembered by id so renaming or moving it is fine.
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* deleted: make a new one */ }
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function subfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// Same rule as the builder's nextMondayDate(): Sunday → tomorrow, Saturday → in 2 days.
function nextMonday_() {
  const now = new Date();
  const weekday = Number(Utilities.formatDate(now, TZ, 'u'));   // 1 = Monday … 7 = Sunday
  return Utilities.formatDate(new Date(now.getTime() + (8 - weekday) * 864e5), TZ, 'yyyy-MM-dd');
}
