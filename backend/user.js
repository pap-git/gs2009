import fs from "node:fs"
import path from "node:path"
import { md5 } from "js-md5"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getDB(path) {
    if (path.toString().length <= 0) throw new Error("Path for specific DB is not vaild.")
    return JSON.parse(fs.readFileSync(path))
}

async function sendDB(path, object) {
    if (path.toString().length <= 0) throw new Error("Path for specific DB is not vaild.")
    fs.writeFileSync(path, JSON.stringify(object))
    return true
}

const user = {
    secretDB: path.join("secretdb.json"),
    userdataDB: path.join("userdb.json"),
    add: async function(email, auth) {
        let db = await getDB(user.secretDB)
        if (await user.exists(email, "boolean")) return false;
        db.push({
            "email": email,
            "auth": auth
        })
        const result = await sendDB(user.secretDB, db)
        return result
    },
    exists: async function(email, type) {
        const secretdb = await getDB(user.secretDB)
        const userdatadb = await getDB(user.userdataDB)
        const ArrayResult = []
        secretdb.forEach(user => {
            if (user.email == email) ArrayResult.push("secret")
        });

        userdatadb.forEach(user => {
            if (user.email == email) ArrayResult.push("userdata")
        });

        switch (type) {
            case "boolean":
                return ArrayResult.length == 0 ? false : true
            case "array":
            default:
                return ArrayResult
        }
    },
    auth: async function(email, auth) {
        const db = await getDB(user.secretDB)
        let result = false
        db.forEach(user => {
            if (!(user.email == email)) return
            if (user.auth == auth) result = true
        });
        return result;
    },
    get: async function(email, auth, serviceID) {
        const db = await getDB(user.userdataDB)
        let userData = undefined
        if (!(user.exists(email, "boolean"))) throw new Error("No userdata exists for this user.")
        db.forEach((user) => {
            if (!(user.email == email)) return
            user.data.forEach((data, i) => {
                if (!(data.serviceID == serviceID)) return
                userData = data
            })
        })
        return userData
    },
    md5saltMe: function(string) {
        return md5(md5(md5(string) + process.env.GS2009_AUTH_SECRET1) + process.env.GS2009_AUTH_SECRET2)
    },
    modifyData: async function(email, serviceID, object, returnObject) {
        if (!await user.exists(email, "boolean")) throw new Error("User does not exist in database.")
        let db = await getDB(user.userdataDB)

        db.forEach((user) => {
            if (!(user.email == email)) return
            user.data.forEach((data, i) => {
                if (!(data.serviceID == serviceID)) return
                else {
                    user.data.splice(i, 1)
                }
            })
            user.data.push({
                serviceID: serviceID,
                settings: object
            })
        })

        await sendDB(user.userdataDB, db)
        if (returnObject) return {
            serviceID: serviceID,
            settings: object
        }
        else return true
    }
}

export default user