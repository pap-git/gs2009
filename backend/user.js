import fs from "node:fs"
import path from "node:path"
import { md5 } from "js-md5"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getDB(path) {
    if (path.toString().length <= 0) throw new Error("")
    return JSON.parse(fs.readFileSync(path))
}

const user = {
    secretDB: path.join("secretdb.json"),
    userdataDB: path.join("userdb.json"),
    add: function(email, auth) {
        const db = getDB(user.secretDB)
    },
    exists: async function(email, type) {
        const secretdb = await getDB(user.secretDB)
        const userdatadb = await getDB(user.userdataDB)
        const ArrayResult = []
        secretdb.forEach(user => {
            if (user.email == email) ArrayResult.join("secret")
        });

        userdatadb.forEach(user => {
            if (user.email == email) ArrayResult.join("userdata")
        });

        switch (type) {
            case "boolean":
                return ArrayResult.length < 1 ? true : false
            case "array":
            default:
                return ArrayResult
        }
    },
    auth: function(email, auth) {
        const db = getDB(user.secretDB)
        const result = false;
        db.forEach(user => {
            if (!(user.email == email)) return
            if (user.auth == auth) result = true;
        });
        return result;
    },
    get: async function(email, auth) {
        const db = await getDB(user.secretDB)
        if (!(user.exists(email).toString().match("userdata"))) throw new Error("No userdata exists for this user.")
        db.forEach(user => {
            if (!(user.email == email)) return
            console.log(auth)
            userData = user
        });
        return userFound ? userData : undefined
    },
    md5saltMe: function(string) {
        return md5(md5(md5(string) + process.env.GS2009_AUTH_SECRET1) + process.env.GS2009_AUTH_SECRET2)
    }
}

export default user