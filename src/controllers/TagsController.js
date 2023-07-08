const knex = require("../database/knex")
const AppError = require("../utils/AppError")
const sqliteConnection = require("../database/sqlite")


class TagsController {
    async index(request, response) {
    const {user_id} = request.params
    

    const database = await sqliteConnection()
    const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id])

    if(!user) {
        throw new AppError("User not found")
    }

        const tags = await knex("tags")
        .where({user_id})

        return response.json(tags)
    }
}

module.exports = TagsController