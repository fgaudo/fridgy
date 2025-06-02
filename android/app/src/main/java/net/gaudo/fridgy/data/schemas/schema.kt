package net.gaudo.fridgy.data.schemas

import android.database.sqlite.SQLiteDatabase
import android.provider.BaseColumns
import java.lang.Exception

object Schema {
    object Product : BaseColumns {
        const val TABLE_NAME = "product"
        const val COLUMN_NAME = "name"
        const val COLUMN_CREATION_DATE = "creation_date"
        const val COLUMN_STORAGE_ID = "storage_id"
    }

    object ProductExpiration : BaseColumns {
        const val TABLE_NAME = "product_expiration"
        const val COLUMN_DATE = "date"
        const val COLUMN_PRODUCT_ID = "product_id"
    }

    object Storage : BaseColumns {
        enum class Type(val type: String) {
            Fridge("fridge"),
            Freezer("freezer"),
            Other("other")
        }

        const val TABLE_NAME = "storage"
        const val COLUMN_NAME = "name"
    }
}

fun createSchema(db: SQLiteDatabase) {
    if (!db.inTransaction()) {
        throw Exception("not in transaction")
    }

    db.execSQL("""
        CREATE TABLE ${Schema.Storage.TABLE_NAME}(
            ${Schema.Storage.COLUMN_NAME} TEXT UNIQUE NOT NULL
        )
    """.trimIndent())

    db.execSQL("""
        CREATE TABLE ${Schema.Product.TABLE_NAME}(
            ${BaseColumns._ID} INTEGER PRIMARY KEY ASC AUTOINCREMENT,
            ${Schema.Product.COLUMN_NAME} TEXT NOT NULL,
            ${Schema.Product.COLUMN_CREATION_DATE} INTEGER NOT NULL,
            ${Schema.Product.COLUMN_STORAGE_ID} INTEGER NOT NULL,
            FOREIGN KEY(${Schema.Product.COLUMN_STORAGE_ID})
                REFERENCES ${Schema.Storage.TABLE_NAME}(${BaseColumns._ID})
                ON DELETE CASCADE
        )
    """.trimIndent())

    db.execSQL("""
        CREATE TABLE ${Schema.ProductExpiration.TABLE_NAME}(
            ${Schema.ProductExpiration.COLUMN_DATE} INTEGER NOT NULL,
            ${Schema.ProductExpiration.COLUMN_PRODUCT_ID} INTEGER UNIQUE NOT NULL,
            FOREIGN KEY(${Schema.ProductExpiration.COLUMN_PRODUCT_ID})
                REFERENCES ${Schema.Product.TABLE_NAME}(${BaseColumns._ID})
                ON DELETE CASCADE
        )
    """.trimIndent())
}


