import puppeteer from "puppeteer";
import { readFile } from "fs/promises";

console.log("***** SKRIPT START *****");

const headless = process.argv.indexOf("-not_headless") > -1 ? false : true;
const cookieIndex = process.argv.indexOf("-strava_cookie");
if (cookieIndex == -1) {
  console.error("strava cookie missing");
  process.exit(1);
}
const stravaCookie = process.argv[cookieIndex + 1];
console.log("StravaCookie: " + stravaCookie);
console.log("Headless: " + headless);

var config = JSON.parse(await readFile("config.json", "utf8"));
await check();

console.log("***** SKRIPT END *****");

async function check() {
  const browser = await puppeteer.launch({
    dumpio: true,
    headless: headless,
    args: ["--no-sandbox"],
  });
  console.log("Browser instance loaded");

  const page = await browser.newPage();
  console.log("New Page loaded");

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const type = request.resourceType();
    const url = request.url().toLowerCase();
    if (
      type === "image" ||
      type === "media" ||
      type === "font" ||
      type === "fetch" ||
      //   type === "xhr" ||
      url.endsWith(".m3u8")
    ) {
      request.abort();
    } else {
      //   console.log(type);
      //   console.log(url);
      request.continue();
    }
  });

  const cookies = [
    {
      name: "_strava4_session",
      value: stravaCookie,
      domain: ".strava.com",
    },
  ];

  await page.setCookie(...cookies);
  await page.goto("https://www.strava.com/dashboard?num_entries=40", {
    timeout: 300000,
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector("div.feature-feed > div", { visible: true });
  console.log("Strava Page loaded");

  let elements = await page.$$("div.feature-feed > div");

  console.log(`Number of activities: ${elements.length}`);

  for (let element of elements) {
    // await element.screenshot({
    //     path: 'screenshot.jpg'
    // });
    var activity = {};

    activity.athleteName = await element
      .$eval('a[data-testid="owners-name"]', (a) => a.textContent)
      .catch((err) => null);
    activity.athleteID = await element
      .$eval('a[data-testid="owners-name"]', (a) => a.getAttribute("href"))
      .catch((err) => null);
    if (activity.athleteID == null || activity.athleteID.match(/clubs/))
      continue;
    if (activity.athleteID != null)
      activity.athleteID = activity.athleteID.match(/\/athletes\/(\d+)/)[1];

    activity.title = await element
      .$eval("h3[class*=ActivityEntryBody]", (h3) => h3.textContent)
      .catch((err) => null);
    activity.type = await element
      .$eval("title", (time) => time.textContent)
      .catch((err) => "GroupActivity");
    var buttons = await element.$$('button[data-testid="kudos_button"]');

    let stats = await element.$$('ul[class*="Stats"] > li');
    for (let stat of stats) {
      var key = await stat
        .$eval("div > span", (span) => span.textContent)
        .catch((err) => null);
      var value = await stat
        .$eval("div > div", (div) => div.textContent)
        .catch((err) => null);
      activity["stat_" + key] = value;
      if (key == "Distance") activity["stat_DistanceInt"] = parseInt(value);
      if (key == "Time")
        activity["stat_TimeMinutes"] = parseTimeToMinutes(value);
    }

    logActivity(activity);

    if (
      activity.athleteID == config.myAthleteID &&
      activity.type != "GroupActivity"
    ) {
      console.log("--> It`s me");
      continue;
    }
    if (config.ignoreAthlete.includes(activity.athleteID)) {
      console.log("--> Athlete to be ignored");
      continue;
    }

    for (let button of buttons) {
      var buttonText = await (await button.getProperty("title")).jsonValue();
      if (buttonText == "View all kudos") {
        console.log("--> Kudos already given");
        continue;
      }
      if (isKudoEntitled(activity)) {
        await button.click();
        console.log("--> Kudos given");
      } else {
        console.log("--> Sorry, no kudos");
      }
    }
  }

  await browser.close();
}

function logActivity(activity) {
  console.log(`${activity.athleteName} - ${activity.title}`);
}

function isKudoEntitled(activity) {
  if (config.kudoRules.distance[activity.type]) {
    if (activity.stat_DistanceInt >= config.kudoRules.distance[activity.type])
      return true;
  } else if (config.kudoRules.time < activity.stat_TimeMinutes) return true;
  return false;
}

function parseTimeToMinutes(timeStr) {
  let totalMinutes = 0;
  const hoursMatch = timeStr.match(/(\d+)\s*h/);
  const minutesMatch = timeStr.match(/(\d+)\s*m/);

  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);

  return totalMinutes;
}
