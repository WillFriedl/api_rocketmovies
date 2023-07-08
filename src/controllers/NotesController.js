const knex = require("../database/knex")
const AppError = require("../utils/AppError")

const sqliteConnection = require("../database/sqlite")

class NotesController{
    async create(request, response) {
        const {title, description, rating, tags} = request.body
        const {user_id} = request.params

        const database = await sqliteConnection()
        const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id])

        if(!user) {
            throw new AppError("User not found")
        }

        if (rating < 1 || rating > 5) {
            throw new AppError("The note must be between 0 and 5")
          }

        const [note_id] = await knex("notes").insert({
            title,
            description,
            rating,
            user_id
        })

        const tagsInsert = tags.map(name => {
            return {
                note_id,
                name,
                user_id
            }
        })

        await knex("tags").insert(tagsInsert)

        return response.status(201).json({
            status: "success",
            message: "Note created"
        })
    } 

    async show(request, response) {
        const {id} = request.params

        const database = await sqliteConnection()

        const checkNoteExists = await database.get("SELECT * FROM notes WHERE id = (?)", [id])

        if(!checkNoteExists){
            return response.status(404).json({
                status: "not found",
                message: "This note not exists!"
            })
            }
        
        const note = await knex("notes").where({id}).first()
        const tags = await knex("tags").where({note_id: id}).orderBy("name")

        return response.status(302).json({
            ...note,
            tags
        })
    }

    async delete(request, response) {
        const {id} = request.params

        const database = await sqliteConnection()

        const checkNoteExists = await database.get("SELECT * FROM notes WHERE id = (?)", [id])

        if(!checkNoteExists){
            return response.status(404).json({
                status: "not found",
                message: "This note not exists!"
            })
            }

        await knex("notes").where({id}).delete()

        return response.status(202).json({
            status: "accepted",
            message: `Note ${id} deleted`
        })
    } 

    async index(request, response) {
        const {title, user_id, tags} = request.query
        const {id} = request.params

        const database = await sqliteConnection()

        const checkNoteExists = await database.get("SELECT * FROM notes WHERE id = (?)", [id])

        if(!checkNoteExists){
            return response.status(404).json({
                status: "not found",
                message: "This note not exists!"
            })
            }

        let notes

        if (tags) {
            const filterTags = tags.split(',').map(tag => tag.trim())
            
            notes = await knex("tags")
                .select(["notes.id", "notes.title", "notes.user_id",])
                .where("notes.user_id", user_id)
                .whereLike("notes.title", `%${title}%`)
                .whereIn("name", filterTags)
                .innerJoin("notes", "notes.id", "tags.note_id")
                .groupBy("notes.id")
                .orderBy("notes.title")
        } else {
            notes = await knex("notes")
                .where({user_id})
                .whereLike("title", `%${title}%`)
                .orderBy("title")
        }

        const userTags = await knex("tags").where({user_id})
        const notesWithTags = notes.map(note => {
            const noteTags = userTags.filter(tag => tag.note_id === note.id)

            return {
                ...note,
                tags: noteTags
            }
        })

        return response.status(302).json(notesWithTags)
    }
}

module.exports = NotesController