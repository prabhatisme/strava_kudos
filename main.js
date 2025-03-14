import https from 'https';
import { readFile } from 'fs/promises';

// const STRAVA_COOKIE = '3s35olf0ndd9gcmietdip371tgvmd33k';
let COOKIE_VALUE = '';

await main();

async function main() {
    console.log('***** SKRIPT START *****');

    try {
        var config = JSON.parse(await readFile('config.json', 'utf8'));
        if (!config._strava4_session) throw new Error(`'_strava4_session' missing in config`);
        if (!config.myAthleteID) throw new Error(`'myAthleteID' missing in config`);

        setCookieValue(config._strava4_session);
        const csrfToken = await getCsrfToken();
        const activities = await getActivities(csrfToken, config);
        await sendKudos(csrfToken, activities);
    } catch (error) {
        console.error(error);
    }
    console.log('***** SKRIPT END *****');
}

function setCookieValue(cookieValue) {
    console.log('StravaCookie: ' + cookieValue);
    COOKIE_VALUE = `_strava4_session=${cookieValue}`;
}

async function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            console.log(`Status Code: ${res.statusCode}`);

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data);
            });
        });

        req.on('error', (e) => {
            console.error('Error:', e);
            reject(new Error(`Request failed: ${e.message}`));
        });

        req.end();
    });
}

async function getCsrfToken() {
    const options = {
        hostname: 'www.strava.com',
        path: '/dashboard',
        method: 'GET',
        headers: {
            Cookie: COOKIE_VALUE,
        },
    };

    const data = await makeRequest(options);
    const csrfTokenMatch = data.match(/<meta name="csrf-token" content="([^"]+)"/);
    if (csrfTokenMatch) {
        const csrfToken = csrfTokenMatch[1];
        console.log('Parsed CSRF Token:', csrfToken);
        return csrfToken;
    } else {
        console.log('CSRF Token not found in response.');
        throw new Error('CSRF Token not found');
    }
}

async function getActivities(csrfToken, config) {
    const options = {
        hostname: 'www.strava.com',
        path: `/dashboard/feed?feed_type=following&athlete_id=${config.myAthleteID}&num_entries=40`,
        method: 'GET',
        headers: {
            'Cookie': COOKIE_VALUE,
            'x-csrf-token': csrfToken,
        },
    };

    const data = await makeRequest(options);
    const feed = JSON.parse(data);
    const activities = feed.entries.filter((entry) => entry.entity === 'Activity');
    console.log(`Number of activities: ${activities.length}`);

    let filteredActivities = [];
    activities.forEach((activityItem) => {
        const stats = extractActivityStats(activityItem);

        console.log(`Athlete: ${activityItem.activity.athlete.athleteName}, Activity: ${activityItem.activity.activityName}, Type: ${activityItem.activity.type}, Has Kudoed: ${activityItem.activity.kudosAndComments.hasKudoed}, Stats: ${JSON.stringify(stats)}`);

        if (activityItem.activity.kudosAndComments.hasKudoed) {
            console.log('--- Already kudoed this activity');
            return;
        }
        if (config.ignoreAthlete && config.ignoreAthlete.includes(activityItem.activity.athlete.athleteId)) {
            console.log('--- Athlete to be ignored');
            return;
        }
        if (config.kudoRules && noKudosForStats(stats, activityItem.activity.type, activityItem.activity.activityName, config.kudoRules)) {
            console.log('/// Activity stats do not meet criteria');
            return;
        }

        console.log("+++ Let's give kudos");
        filteredActivities.push(activityItem);
    });

    return filteredActivities;
}

function noKudosForStats(stats, activityType, activityName, kudoRules) {
    // Check for name
    if (kudoRules.activityNames && kudoRules.activityNames.length > 0) {
        for (const namePattern of kudoRules.activityNames) {
            const regex = new RegExp(namePattern, 'i');
            if (regex.test(activityName)) {
                return false;
            }
        }
    }

    // Check for minimum distance
    if (kudoRules.min_distance && kudoRules.min_distance[activityType] && stats.Distance) {
        const distanceValue = parseInt(stats.Distance);
        if (distanceValue < kudoRules.min_distance[activityType]) {
            return true;
        }
    }

    // Check for minimum time
    if (kudoRules.min_time && kudoRules.min_time[activityType] && stats.Time) {
        const timeValue = parseTimeToMinutes(stats.Time);
        if (timeValue < kudoRules.min_time[activityType]) {
            return true;
        }
    }

    return false;
}

function extractActivityStats(activityItem) {
    const stats = {};
    activityItem.activity.stats.forEach((stat) => {
        const subtitleKey = `${stat.key}_subtitle`;
        let subtitle;
        for (const s of activityItem.activity.stats) {
            if (s.key === subtitleKey) {
                subtitle = s.value;
                break;
            }
        }
        if (subtitle) {
            const value = stat.value.replace(/<[^>]*>/g, '').trim();
            stats[subtitle] = value;
        }
    });
    return stats;
}

function parseTimeToMinutes(timeStr) {
    let totalMinutes = 0;
    const hoursMatch = timeStr.match(/(\d+)\s*h/);
    const minutesMatch = timeStr.match(/(\d+)\s*m/);

    if (hoursMatch) totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);

    return totalMinutes;
}

async function sendKudos(csrfToken, activities) {
    for (const activityItem of activities) {
        const options = {
            hostname: 'www.strava.com',
            path: `/feed/activity/${activityItem.activity.id}/kudo`,
            method: 'POST',
            headers: {
                'Cookie': COOKIE_VALUE,
                'x-csrf-token': csrfToken,
            },
        };

        console.log(`Sending kudos to activity: ${activityItem.activity.id}: ${activityItem.activity.athlete.athleteName} - ${activityItem.activity.activityName}`);

        const data = await makeRequest(options);
        console.log('Response:', data);
    }
}
