[![Strava Kudos Daily](https://github.com/prabhatisme/strava_kudos/actions/workflows/strava-kudos.yml/badge.svg)](https://github.com/prabhatisme/strava_kudos/actions/workflows/strava-kudos.yml)

# Strava Kudos 👍

The project is a Node.js application designed to interact with the Strava Website to automate the process of giving kudos to activities.

## Config 🔧

The config.json file is a configuration file for your Strava Kudos Node.js project. It contains settings and rules that the application uses to determine how and when to give kudos to activities. Here is a summary of its contents in the context of the project:

- _strava4_session: This is the cookie value for login purposes (the cookie value can be found as **_strava4_session** in your browser)

- myAthleteID: This is the ID of the authenticated user. The application uses this ID to identify the user's activities and interactions.

- ignoreAthlete: This is a list of athlete IDs that the application should ignore when giving kudos. Activities from these athletes will not receive kudos from the application.

- kudoRules: This section defines the rules for giving kudos based on activity type, distance, and time.

    - distance: Specifies the minimum distance required for different types of activities to receive kudos. For example, a run must be at least 5 km, while a ride must be at least 20 km.
    - time: Specifies the minimum duration (in minutes) required for an activity to receive kudos.

This configuration allows the application to customize its behavior based on user preferences and specific criteria for different types of activities.

## How to use ⚙️

- edit **config.json.example** and save as **config.json**
- run **docker compose up -d --build**
