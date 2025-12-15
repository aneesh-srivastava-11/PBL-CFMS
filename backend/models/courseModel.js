const db = require('../config/db');

class Course {
    static async create(course_code, course_name, semester, faculty_id) {
        const [result] = await db.execute(
            'INSERT INTO courses (course_code, course_name, semester, faculty_id) VALUES (?, ?, ?, ?)',
            [course_code, course_name, semester, faculty_id]
        );
        return result.insertId;
    }

    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM courses');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM courses WHERE id = ?', [id]);
        return rows[0];
    }

    static async findByFaculty(faculty_id) {
        const [rows] = await db.execute('SELECT * FROM courses WHERE faculty_id = ?', [faculty_id]);
        return rows;
    }

    static async delete(id) {
        return db.execute('DELETE FROM courses WHERE id = ?', [id]);
    }
}

module.exports = Course;
