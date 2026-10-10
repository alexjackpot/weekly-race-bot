# Weekly race bot

Every Saturday at 10:17 (Bangkok time), GitHub opens https://jackpotcomps.netlify.app/ in a
headless browser and goes through the same steps you'd do by hand: Weekly Race Card tab →
next Monday → **Use these dates** → this week's colour → **⬇ PNG** + **⬇ .zip**. Then it
DMs both files to Mathis on Slack. Your Mac doesn't need to be on.

The bot clicks the real buttons on the live site, so any change you deploy to the builder
shows up in the next card. A test render of Oct 5-11 in colour 2 matched your hand-made
export pixel for pixel.

`fonts/` holds the same Poppins files as your Mac. The builder draws the date pill in
Poppins but only gets it from the system: its Google Fonts `@import` comes after the
`@font-face` rules, so browsers ignore it. The bot installs these files first and refuses
to send if Poppins still isn't there.

## Colours

One colour per week, using the builder's 1-6 switch:
Oct 5 **2 Gold** → Oct 12 **3 Brand Violet** → Oct 19 **4 Indigo** → Oct 26 **5 Azure** →
Nov 2 **6 Royal Deep** → Nov 9 **1 Midnight** → and round again.
To use fewer colours, set the repo variable `ROTATION`, e.g. `1,2,6`.

## One-time setup

1. **Slack token.** Go to https://api.slack.com/apps → *Create New App* → *From scratch*,
   name it "Weekly race", and pick the Jackpot workspace. Under *OAuth & Permissions* →
   **User Token Scopes**, add `files:write` and `im:write`. Click *Install to Workspace*
   and copy the **User OAuth Token** (`xoxp-…`). A user token posts as you, not as a bot.
   If the workspace makes you request approval, an admin has to approve it.
2. **Mathis's member ID.** In Slack, open his profile → ⋮ → *Copy member ID* (`U…`).
   Copy yours too, so you can send a test to yourself.
3. **GitHub repo** (private). Settings → Secrets and variables → Actions:
   - Secret `SLACK_TOKEN` = the `xoxp-…` token
   - Variable `SLACK_TO` = Mathis's member ID
   - optional variable `SLACK_MESSAGE`, default `Weekly race card for {range}`
     (`{range}` becomes e.g. `Oct 12-18`, `{theme}` becomes the colour name)

## Test it

On GitHub, go to Actions → *Weekly race card* → **Run workflow**, and put your own member
ID in *send_to*. You can do this from your phone's browser too. Leave *send_to* blank to
send to Mathis.

Each run also keeps the PNG and the zip for 30 days under the run's *Artifacts*. If a run
fails, GitHub emails you.

## Change the day or time

Edit the `cron` line in `.github/workflows/weekly-race.yml`. It uses UTC, which is
Bangkok time minus 7 hours. `'17 3 * * 6'` means Saturday 03:17 UTC.

## Run it locally

```bash
npm install && npx playwright install chromium
npm run dry-run           # renders next week into out/ and prints what it would send
node render.js 2026-10-12 3
```
