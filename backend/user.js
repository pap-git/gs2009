import fs from "node:fs"
import path from "node:path"

async function getDB(path) {
    if (path.toString().length <= 0) throw new Error("")
    return JSON.parse(fs.readFileSync(user.db))
}

const user = {
    db: path.join("userdb.json"),
    add: function(email, auth) {
        const db = getDB(user.db)
        
    },
    get: async function(email, auth) {
        const db = await getDB(user.db)
        const userFound = false;
        let userData = false;
        db.forEach(user => {
            if (!(user.email == email)) return
            userData = user
        });
        return userFound ? userData : undefined
    }
}

export default user