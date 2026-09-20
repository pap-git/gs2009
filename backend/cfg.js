import toml from "toml"
import fs from "node:fs"
import {log} from "./scripts/things.js";
import strings from "./strings.js";
import path from "node:path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from "googleapis/build/src/apis/config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const internal = {
    isJSON: function(json) {
        try {
            JSON.parse(JSON.stringify(json))
            return true;
        } catch(e) {
            return false;
        }
    }
}

const cfg = {
    tag: "cfg",
    template: fs.readFileSync(path.join("backend", "config.template.toml")),

    isOld: function(json) {
        const waybackdate = "20100324182056";
        const only_old_date = "2010-03-20";
        if (!internal.isJSON(json)) throw new Error("Not JSON")

        try {
            const test = {
                PORT: json.PORT,

                LANGUAGE: json.LANGUAGE,

                ENGINE: json.ENGINE,
                SEARXNG_URL: json.SEARXNG_URL,
                SEARXNG_ISHTTPS: json.SEARXNG_ISHTTPS,
                SEARXNG_USEOTHERENGINE: json.SEARXNG_USEOTHERENGINE,

                API_KEY: json.API_KEY,
                CSE_ID: json.CSE_ID,

                REDIRECTOR_OPTION: json.REDIRECTOR_OPTION,
                REDIRECT_HTTP: json.REDIRECTOR_HTTP,

                WAYBACKDATE: json.WAYBACKDATE,
                YT2009_ADDRESS: json.YT2009_ADDRESS,

                ONLY_OLD: json.ONLY_OLD,
                ONLY_OLD_DATE: json.ONLY_OLD_DATE,

                SEARCH_QUERY: json.SEARCH_QUERY
            }

            if (typeof(test.PORT) == "undefined") return false
            else return true
        } catch(e) {
            return false
        }
    },

    convertOld: function(oldjson) {
        let serverpage = true
        if (!internal.isJSON(oldjson)) throw new Error("Not JSON")
        if (!cfgparser.isOld(oldjson)) throw new Error("Not an old configuration file")
        if (typeof(oldjson.ENABLE_SERVER_SETTINGS_PAGE)) serverpage = true
        else serverpage = oldjson.ENABLE_SERVER_SETTINGS_PAGE
        const result = {
            "server": {
                "port": oldjson.PORT,
                "enableServerSettingsPage": serverpage
            },
            "backend": {
                "engine": {
                    "type": oldjson.ENGINE,
                    "config": {
                        "searxng": {
                            "url": oldjson.SEARXNG_URL,
                            "forceGoogle": oldjson.SEARXNG_USEOTHERENGINE
                        },
                        "cse": {
                            "api_key": oldjson.API_KEY,
                            "cse_id": oldjson.CSE_ID
                        }
                    }
                },
                "searchQuery": oldjson.SEARCH_QUERY
            },
            "frontend": {
                "enableCookieBasedSettings": false,
                "default": {
                    "language": oldjson.LANGUAGE,
                    "searchQuery": oldjson.SEARCH_QUERY,
                    "before": oldjson.ONLY_OLD_DATE,
                    "redirect": {
                        "enabled": ["wayback", "yt2009"],
                        "properties": {
                            "wayback_date": oldjson.WAYBACKDATE,
                            "yt2009_url": oldjson.YT2009_ADDRESS
                        }
                    }
                }
            }
        }

        if (typeof(result.frontend.default.redirect.properties.wayback_date) == "undefined") {
            result.frontend.default.redirect.enabled.splice(result.frontend.redirect.properties.enabled.indexOf("wayback"), 1)
        }
        if (typeof(result.frontend.default.redirect.properties.yt2009_url) == "undefined") {
            result.frontend.default.redirect.enabled.splice(result.frontend.redirect.properties.enabled.indexOf("yt2009"), 1)
        }

        return result
    },

    gen: async function (pathtoconfig, force) {
        const p = pathtoconfig ? path.join(__dirname, "../", pathtoconfig) : path.join(__dirname, "../config.toml")
        if (!(cfg.exists(path.join(__dirname, "config.json")) && cfg.exists(path.join(__dirname, "config.toml"))) || force) {
            log.i(force ? "re" + strings.cfg.gen : strings.cfg.gen, cfg.tag)
            log.w(strings.l + strings.cfg.gen_w + strings.l, cfg.tag)

            fs.writeFileSync(p, cfg.template);
            log.i(strings.cfg.gen_after + p)
        }
    },
    exists: function (pathtoconfig) {
        const p = pathtoconfig ? pathtoconfig : path.join(__dirname, "../config.json")
        return fs.existsSync(p)
    }
}

export default cfg