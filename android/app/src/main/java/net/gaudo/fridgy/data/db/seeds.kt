package net.gaudo.fridgy.data.db

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE
import java.lang.Exception

fun seed(db: SQLiteDatabase) {
    if (!db.inTransaction()) {
        throw Exception("not in transaction")
    }

    db.insertWithOnConflict(
        Schema.Storage.TABLE_NAME,
        null,
        ContentValues().apply {
            put(
                Schema.Storage.COLUMN_NAME,
                Schema.Storage.Type.Fridge.type
            )
        },
        CONFLICT_IGNORE
    )
    db.insertWithOnConflict(
        Schema.Storage.TABLE_NAME,
        null,
        ContentValues().apply {
            put(
                Schema.Storage.COLUMN_NAME,
                Schema.Storage.Type.Freezer.type
            )
        }, CONFLICT_IGNORE
    )
}