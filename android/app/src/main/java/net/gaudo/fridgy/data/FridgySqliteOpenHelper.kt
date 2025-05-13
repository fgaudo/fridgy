package net.gaudo.fridgy.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns
import android.util.Log

class FridgySqliteOpenHelper(
    context: Context?
) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    override fun onConfigure(db: SQLiteDatabase?) {
        super.onConfigure(db)
        db?.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(createProductTableSql)

        db.execSQL(createProductExpirationTableSql)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    }

    companion object {
        const val DATABASE_VERSION = 1
        const val DATABASE_NAME = "fridgy.db"
    }
}

 val createProductTableSql = """
        CREATE TABLE ${Schema.Product.TABLE_NAME}(
            ${BaseColumns._ID} INTEGER PRIMARY KEY ASC AUTOINCREMENT,
            ${Schema.Product.COLUMN_NAME} TEXT NOT NULL,
            ${Schema.Product.COLUMN_CREATION_DATE} INTEGER NOT NULL
        )
    """.trimIndent()

 val createProductExpirationTableSql = """
        CREATE TABLE ${Schema.ProductExpiration.TABLE_NAME}(
            ${Schema.ProductExpiration.COLUMN_DATE} INTEGER NOT NULL,
            ${Schema.ProductExpiration.COLUMN_PRODUCT_ID} INTEGER UNIQUE NOT NULL,
            FOREIGN KEY(${Schema.ProductExpiration.COLUMN_PRODUCT_ID})
                REFERENCES ${Schema.Product.TABLE_NAME}(${BaseColumns._ID})
                ON DELETE CASCADE
        )
    """.trimIndent()

