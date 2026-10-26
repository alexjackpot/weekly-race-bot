# Weekly race bot

**This week's card: [latest/](latest/)**

Every Saturday at 08:17 (Bangkok time), GitHub opens https://jackpotcomps.netlify.app/ in a
headless browser and goes through the same steps as by hand: Weekly Race Card tab → next
Monday → **Use these dates** → this week's colour → **⬇ PNG** + **⬇ .zip**. It then replaces
the contents of [`latest/`](latest/) with the two files. A Google Apps Script then copies
them into a shared Drive folder, and a Slack reminder sends Mathis that folder at 11:00.
Nobody's computer needs to be on.

The bot clicks the real buttons on the live site, so any change deployed to the builder
shows up in the next card.

## Google Drive

`drive/Code.gs` is a Google Apps Script that runs on Google's servers under alex@jackpot.bet,
in the "Weekly race card" project at script.google.com. Every Saturday, hourly from 09:00 to 20:00 Bangkok, it copies `latest/` into a "Weekly race
card" Drive folder once GitHub has published the new week, shared by link, and moves the previous week into "Previous weeks". To set
it up, paste it into a new project at script.google.com, run `setup` once and allow access.
The log prints the folder link.

## The Slack reminder

Set once in Slack, in any conversation, with the Drive folder link that `setup` printed:

```
/remind @Mathis "This week's race card (PNG + zip): <Drive folder link>" every Saturday at 11:00
```

## Colours

One colour per week, using the builder's 1-6 switch:
Oct 5 **2 Gold** → Oct 12 **3 Brand Violet** → Oct 19 **4 Indigo** → Oct 26 **5 Azure** →
Nov 2 **6 Royal Deep** → Nov 9 **1 Midnight** → and round again.
To use fewer colours, set the repo variable `ROTATION` (Settings → Secrets and variables →
Actions → Variables), e.g. `1,2,6`.

## Fonts

`fonts/` holds Poppins (SIL Open Font License, see `fonts/OFL.txt`). The builder draws the
date pill in Poppins but only gets it from the system: its Google Fonts `@import` comes
after the `@font-face` rules, so browsers ignore it. The bot installs these files first and
stops with an error rather than publish a card in the wrong font.

## Re-run or fix a week

Actions → *Weekly race card* → **Run workflow**. Leave the fields blank for next week, or
set a Monday (`2026-10-19`) and/or a colour (1-6). Each run replaces `latest/`. If a run
fails, GitHub emails the repo owner.

## Change the day or time

Edit the `cron` lines in `.github/workflows/weekly-race.yml`. They use UTC, which is Bangkok
time minus 7 hours: `'17 22 * * 5'` means Friday 22:17 UTC, Saturday 05:17 Bangkok. Keep them
well ahead of the reminder: GitHub starts scheduled runs late, by hours on a bad day.

## Run it locally

```bash
npm install && npx playwright install chromium
node render.js                 # next week, this week's colour, into out/
node render.js 2026-10-12 3
```
