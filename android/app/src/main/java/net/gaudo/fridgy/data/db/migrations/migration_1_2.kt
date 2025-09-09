package net.gaudo.fridgy.data.db.migrations

import android.database.sqlite.SQLiteDatabase
import android.provider.BaseColumns
import net.gaudo.fridgy.data.db.Schema
import java.lang.Exception

fun migrate_1_2(db: SQLiteDatabase) {
    if (!db.inTransaction()) {
        throw Exception("Not in a transaction")
    }



    db.execSQL(
        """
        ALTER TABLE ${Schema.Product.TABLE_NAME} 
            ADD ${Schema.Product.COLUMN_STORAGE_ID} INTEGER NOT NULL
    """.trimIndent()
    )

    db.execSQL(
        """
        CREATE TABLE ${Schema.Storage.TABLE_NAME}(
            ${Schema.Storage.COLUMN_NAME} TEXT UNIQUE NOT NULL
        )
    """.trimIndent()
    )

    db.execSQL("""
        CREATE TABLE ${Schema.ProductStorage.TABLE_NAME}(
        ${Schema.ProductStorage.COLUMN_PRODUCT_ID} INTEGER UNIQUE NOT NULL,
        ${Schema.ProductStorage.COLUMN_STORAGE_ID} INTEGER NOT NULL,
        FOREIGN KEY(${Schema.ProductStorage.COLUMN_PRODUCT_ID})
            REFERENCES ${Schema.Product.TABLE_NAME}(${BaseColumns._ID})
            ON DELETE CASCADE,
        FOREIGN KEY(${Schema.ProductStorage.COLUMN_STORAGE_ID})
            REFERENCES ${Schema.Storage.TABLE_NAME}(${BaseColumns._ID})
            ON DELETE CASCADE
        )
    """.trimIndent())

}