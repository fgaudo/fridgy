package net.gaudo.fridgy.data.migrations

import android.database.sqlite.SQLiteDatabase
import net.gaudo.fridgy.data.schemas.Schema
import java.lang.Exception

fun migrate_1_2(db: SQLiteDatabase) {
    if (!db.inTransaction()) {
        throw Exception("Not in a transaction")
    }

    db.execSQL(
        """
        ALTER TABLE ${Schema.Product.TABLE_NAME} ADD ${Schema.Product.COLUMN_STORAGE_ID} INTEGER NOT NULL
      """.trimMargin()
    )

    db.execSQL(
        """
        CREATE TABLE ${Schema.Storage.TABLE_NAME}(
            ${Schema.Storage.COLUMN_NAME} TEXT UNIQUE NOT NULL
        )
    """.trimIndent()
    )

}