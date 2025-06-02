package net.gaudo.fridgy.data.seeds

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import net.gaudo.fridgy.data.schemas.Schema
import java.lang.Exception

fun seed(db: SQLiteDatabase) {
    if (!db.inTransaction()) {
        throw Exception("not in transaction")
    }

    db.insert(
        Schema.Storage.TABLE_NAME,
        null,
        ContentValues().apply {
            put(
                Schema.Storage.COLUMN_NAME,
                Schema.Storage.Type.Fridge.type
            )
        })
    db.insert(
        Schema.Storage.TABLE_NAME,
        null,
        ContentValues().apply {
            put(
                Schema.Storage.COLUMN_NAME,
                Schema.Storage.Type.Freezer.type
            )
        })
    db.insert(
        Schema.Storage.TABLE_NAME,
        null,
        ContentValues().apply {
            put(
                Schema.Storage.COLUMN_NAME,
                Schema.Storage.Type.Other.type
            )
        })
}