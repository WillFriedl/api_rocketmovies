const {hash, compare} = require("bcryptjs")
const AppError = require("../utils/AppError")

const sqliteConnection = require("../database/sqlite")

class UsersController {
    async create(request, response) {
        const {name, email, password} = request.body

        const database = await sqliteConnection()

        const checkUserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email])

        if (checkUserExists) {
            throw new AppError("This e-mail is already registered!")
        } 

        if (!name) {
            throw new AppError("Name cannot be empty")
        }

        const hashedPassword = await hash(password, 8)

        await database.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword])

        response.status(201).json({name, email, password})

        return response.status(201).json()
    }

    async update(request, response) {
        const {name, email, password, old_password} = request.body
        const {id} = request.params

        const database = await sqliteConnection()
        const user = await database.get("SELECT * FROM users WHERE id = (?)", [id])

        if(!user) {
            throw new AppError("User not found")
        }

        const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email])

        if(userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id){
            throw new AppError("This e-mail is already registered!")
        }

        user.name = name ?? user.name
        user.email = email ?? user.email

        if(password && !old_password){
            throw new AppError("You need to enter the old password to set a new password.")
        }

        if(password && old_password) {
            const checkOldPassword = await compare(old_password, user.password)

            if(!checkOldPassword) {
                throw new AppError("Wrong password")
            }

            user.password = await hash(password, 8)
        }

        await database.run(`
            UPDATE users SET 
            name = ?, 
            email = ?, 
            password = ?,
            updated_at = DATETIME('now')
            WHERE id = ? `,
            [user.name, user.email, user.password, id]
        )

        return response.status(200).json({
            status: "success",
            message: "User updated"
        })
    }

    async delete(request, response) {
        const {id} = request.params

        const database = await sqliteConnection()

        const checkUserExists = await database.get("SELECT * FROM users WHERE id = (?)", [id])

        if(!checkUserExists){
            return response.status(404).json({
                status: "error",
                message: "User not found"
            })
            }

        await database.get("DELETE FROM users WHERE id = (?)", [id])

        return response.status(202).json({
            status: "acepted",
            message: `User ${id} deleted`
        })
    }
}

module.exports = UsersController