package net.gaudo.fridgy.data.queries

import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.gaudo.fridgy.data.db.Schema

fun deleteProductsByIds(ids: List<Long>): suspend (db: SQLiteOpenHelper) -> Unit {
    return { helper ->
        withContext(Dispatchers.IO) {
            val db = helper.writableDatabase
            db.delete(
                Schema.Product.TABLE_NAME,
                "${BaseColumns._ID} IN (${ids.joinToString(", ") { "?" }})",
                ids.map { it.toString() }.toTypedArray()
            )
        }
    }
}