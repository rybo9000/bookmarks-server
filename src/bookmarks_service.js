const bookmarksService = {

    getBookmarks(knex) {
        
        return knex.select('*').from('bookmarks');
    },
    getById(knex, id) {
        return knex.from('bookmarks').select('*').where('id', id).first()
    },
    deleteBookmark(knex, id) {
        return knex('bookmarks')
            .where({ id })
            .delete()
    },
    insertBookmark(knex, newBookmark) {
        return knex
            .insert(newBookmark)
            .into('bookmarks')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    updateBookmark(knex,id, newFields) {
        return knex('bookmarks')
            .where({ id })
            .update(newFields)
    }

};

module.exports = bookmarksService;

