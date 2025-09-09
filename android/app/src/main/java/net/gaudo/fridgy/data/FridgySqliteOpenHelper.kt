package net.gaudo.fridgy.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import net.gaudo.fridgy.data.db.createSchema
import net.gaudo.fridgy.data.db.seed
import net.gaudo.fridgy.data.db.migrations.migrate_1_2

class FridgySqliteOpenHelper(
    context: Context?
) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    override fun onConfigure(db: SQLiteDatabase?) {
        super.onConfigure(db)
        db?.setForeignKeyConstraintsEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        createSchema(db)
        seed(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        migrate_1_2(db)
        seed(db)
    }

    companion object {
        const val DATABASE_VERSION = 2
        const val DATABASE_NAME = "fridgy.db"
    }
}

