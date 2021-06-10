# Itemize Watchdog

Watchdog is the service running at [stats.itemize.no](https://status.itemize.no) which monitors Itemize resources.

The application is first and formost developed as the main monitoring tool for Itemize NTNU, but also have alternative use cases such as red teaming activities or other temporary use cases with it's use of automatic service detection and monitoring.

## Features

- Customizable scopes
  - Domain
    - Monitor DNS lookup changes (resolve ips)
    - Optional monitor subdomains through certificate transparency logs ([crt.sh](https://crt.sh))
  - IP
    - Run port scans and monitor changes
      - Uses nmap under the hood and supports nmap syntax port ranges
  - Endpoint
    - Monitor http/s endpoints for changes in status code, content length or optional regex test (javascript regex syntax)
- Auto discover
  - Domain-Endpoint:
    - When new domains are added, they are initially scanned through a full nmap port scan with service detection. If any http/s services are detected, they are automatically added as endpoints.
  - Domain-IP:
    - When new resolve IPs for domains are found, they are automatically added as new scopes
  - Subdomains:
    - When new subdomains are detected, they are automatically added as new domains. The new domains gets a domain scope added, in addition to a full service scan to detect http/s endpoints.
- Custimizable status front page (**TODO**)
  - Choose which scopes to display on the front status page
  - Customize layout
  - Admin add status messages, such as ETA until services are back up in case of downtime or other notification messages
- Graphs and scan output
  - Display full graph and last scan output on admin page
  - On the admin panel, changes in status per scope can also be marked as healthy or not
- Discord notifications
  - Get notified on Discord when changes are detected
- OAuth admin authentication
- Local authentication (**TODO**)
- Monitor served certificates (**TODO**)

# Setup:

## Docker

Easiest way to get started is with simply running `docker-compose up -d`. This will start up both the node web application on port `localhost:3000` in addition to the mongodb backend.

## Manual

To run the application manually, simply run `npm run start`. Notice you also need to configure a mongodb backend.

## Config

Configuration is done through environment variables. The recommended way to configure these are through a `.env` file. This will automatically be loaded by both docker-compose or the native node application.

| Environment Variable | Description                                                                     | Default                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| PORT                 | Local port to listen to                                                         | `3000`                                                                                                                                           |
| HOST                 | Host to listen too (docker-compose only)                                        | `127.0.0.1`                                                                                                                                      |
| ISSUER               | Oauth Issuer Base URL (will use `.well-known` auto configuration and detection) | `https://auth.itemize.no`                                                                                                                        |
| CLIENT_ID            | Oauth Client ID                                                                 | `N/A` (required)                                                                                                                                 |
| CLIENT_SECRET        | Oauth Client Secret                                                             | `N/A` (required)                                                                                                                                 |
| SECRET               | Strong random generated local secret                                            | If not provided, will auto generate, but this will break cookies on restart.                                                                     |
| BASE_URL             | Base url of application (no trailing slash)                                     | Dev mode: `http://localhost:3000`<br/>Production mode: `https://status.itemize.no/`<br/>Settings this variable will automatically override both. |
| MONGO_DB_URL         | URL to MongoDB                                                                  | `mongodb://mongo/watchdog`                                                                                                                       |
| MAX_SCAN_TIME        | Time before warning of long scan on Discord (seconds)                           | `300`                                                                                                                                            |
| SCAN_PAUSE           | Pause beween scans (seconds, minimum 1)                                         | `60`                                                                                                                                             |
| CLEANUP_INTERVAL     | Interval to run cleanup task on database (seconds, minimum 60)                  | `600`                                                                                                                                            |
| DISCORD_WEBHOOK      | Full webhook URL for Discord                                                    | `N/A` (required)                                                                                                                                 |
| DISCORD_USERNAME     | Interval to run cleanup task on database (seconds, minimum 60)                  | `Itemize Watchdog`                                                                                                                               |
| DISCORD_ICON         | URL of the profile picture for the discord bot                                  | `https://status.itemize.no/icon.png`                                                                                                             |

# OAuth

At the moment, only OAuth is supported for user authentication. In the OAuth responce, the application expects to find a `roles` keys, which should be a list of assigned roles for the user. This list must include `admin` for the user to be able to authenticate. If not, then the user will be denied access.

# Development:

To do local development of this application, simply run:

```bash
npm run dev
```

This will start the hot reloading sapper development server on [localhost:3000](http://localhost:3000). This will also automatically load any `.env` file in the project root folder.

## Formatting

The project is setup with some automatic formatting with prettier and this should be ran before merging code to main:

```bash
npm run format
```

## Linting

The project is setup with some automatic linting tools. Currently the following:

- prettier (syntax)
- eslint (code errors)
- depcheck (unused dependencies)

Unused dependencies should not be pushed to main. Notice however that depcheck does not currently fully support svelte projects and may report imports in `.svelte` files as unused. Please review this list manually and not blindly remove those imports.
