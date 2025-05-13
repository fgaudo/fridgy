package net.gaudo.fridgy.data

import android.content.ContentValues
import android.database.sqlite.SQLiteOpenHelper
import androidx.core.database.sqlite.transaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

fun addProduct(product: Product): suspend (helper: SQLiteOpenHelper) -> Unit {
    return { helper ->
        withContext(Dispatchers.IO) {
            val db = helper.writableDatabase

            if (product.expirationDate == null) {
                val id = db.insert(
                    Schema.Product.TABLE_NAME, null, ContentValues().apply {
                        put(Schema.Product.COLUMN_NAME, product.name)
                        put(Schema.Product.COLUMN_CREATION_DATE, product.creationDate)
                    }
                )
                if (id == -1L) throw Exception("Failed to insert product")
            } else {
                db.transaction {
                    val id = db.insert(
                        Schema.Product.TABLE_NAME, null,
                        ContentValues().apply {
                            put(Schema.Product.COLUMN_NAME, product.name)
                            put(Schema.Product.COLUMN_CREATION_DATE, product.creationDate)
                        }
                    )
                    if (id == -1L) throw Exception("Failed to insert product")
                    val id2 = db.insert(
                        Schema.ProductExpiration.TABLE_NAME, null, ContentValues().apply {
                            put(Schema.ProductExpiration.COLUMN_PRODUCT_ID, id)
                            put(Schema.ProductExpiration.COLUMN_DATE, product.expirationDate)
                        }
                    )
                    if (id2 == -1L) throw Exception("Failed to insert product expiration")
                }
            }
        }
    }
}