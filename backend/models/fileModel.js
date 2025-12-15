const db = require('../config/db');

class File {
    static async create(course_id, file_type, filename, s3_key) {
        // Default visibility: Solutions are hidden (0), others visible (1)
        // Or default all visible as per schema, but let's make solutions hidden by default if desired.
        // For now, schema defaults to 1 (true). Let's stick to that for simplicity, or check logic.
        const is_visible = 1;

        const [result] = await db.execute(
            'INSERT INTO course_files (course_id, file_type, filename, s3_key, is_visible) VALUES (?, ?, ?, ?, ?)',
            [course_id, file_type, filename, s3_key, is_visible]
        );
        return result.insertId;
    }

    static async findByCourseId(course_id) {
        const [rows] = await db.execute('SELECT * FROM course_files WHERE course_id = ? ORDER BY uploaded_at DESC', [course_id]);
        return rows;
    }

    static async setVisibility(id, is_visible) {
        return db.execute('UPDATE course_files SET is_visible = ? WHERE id = ?', [is_visible, id]);
    }

    static async findByFilename(filename) {
        const [rows] = await db.execute('SELECT * FROM course_files WHERE filename = ?', [filename]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM course_files WHERE id = ?', [id]);
        return rows[0];
    }

    static async delete(id) {
        return db.execute('DELETE FROM course_files WHERE id = ?', [id]);
    }
}

module.exports = File;
