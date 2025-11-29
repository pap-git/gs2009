<h5 align="center">
<nobr>
<img width="384" height="288" alt="image" src="https://github.com/user-attachments/assets/f2825850-07a9-4fb3-bf2e-26ec7d69bf4f" />
<img width="384" height="288" alt="image" src="https://github.com/user-attachments/assets/d54fd513-cafd-472b-9a14-e5d0b81f02ac" />
</nobr>
</h5>
<h1 align="center">gs2009</h1>
<h3 align="center">Google search 2009 recreation with node.js and Google Search Custom API</h3>
<h5 align="center">Check Protoweb for early-2000s, Gplex about after 2010+ styles...</h5>

> [!IMPORTANT]
> **This frontend is pretty extremely incompleted!** Please make sure that might has the bugs/crashes while using this frontend.<br>
> Also, if you encounted the bug/or crash, **Please make the issue.**

## Features
 - **2009 google**
 - **Search features!** (images/videos search are not implemented yet)
 - **Simulated login feature**
 - I'm feeling lucky
 - **Add `before:` option automatically**
 - Redirector to **HTTP / [yt2009](https://github.com/ftde0/yt2009) & [Wayback Machine](https://web.archive.org)**

## Usage
### Initialize
1. Install [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/). (tested on node 18.19.1/24.11.1, npm 11.6.2/9.2.0)
2. **Clone the repository with `git clone https://github.com/pap-git/gs2009`**, then `npm install` (if need, `npm audit fix`)
3. `npm start` or `node index.js`
4. It will automatically generates config.json, and runs server at PORT 3000 by default.
5. Go to `http://[IP]:3000/gs2009settings`, then put your **Custom Search API key** and **Programmable Search Engine ID** (CSE ID), then Save it.
### Running the server
`npm start` or `node index.js`
### Updating the server
1. Stop the server if any gs2009 instance running in machine
2. `npm update` or `npm updater.json`

**Before version `1.1.20251124` (Updating to latest)**
1. Copy `config.json` to somewhere
2. Remove gs2009 working folder
3. `git clone https://github.com/pap-git/gs2009`
4. Copy `config.json` to new gs2009 working folder

## Available Preferences

 - **Port**
    - It is hidden in settings page, but you can configure it on config.json.

### Custom Search API key / Programmable Search Engine ID (CSE ID)
**You need this to show search results on this frontend!**
Otherwise, You will be redirected to settings page when you tried to search.

### Language
**Available language:** `en, ja`
 - You can add your native language by pull requesting. Please look this [guide](https://github.com/pap-git/gs2009/wiki/Translation) to start translating!

### Redirector
 - **HTTPS to HTTP**
 - **Redirect to [yt2009](https://github.com/ftde0/yt2009) / [Wayback Machine](https://web.archive.org)** (both/or either)

### Search results
 - `before:` option

## License
apache 2.0 please see license file in repo
