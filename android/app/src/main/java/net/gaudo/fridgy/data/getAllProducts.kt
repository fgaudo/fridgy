package net.gaudo.fridgy.data

import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns
import androidx.core.database.getLongOrNull
import androidx.core.database.sqlite.transaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val getAllProductsSql = run {
    val product = Schema.Product.TABLE_NAME
    val productExpiration = Schema.ProductExpiration.TABLE_NAME

    val product_id = "${product}.${BaseColumns._ID}"
    val product_name = "${product}.${Schema.Product.COLUMN_NAME}"
    val product_creationDate = "${product}.${Schema.Product.COLUMN_CREATION_DATE}"
    val productExpiration_date = "${productExpiration}.${Schema.ProductExpiration.COLUMN_DATE}"
    val productExpiration_productId =
        "${productExpiration}.${Schema.ProductExpiration.COLUMN_PRODUCT_ID}"

    """
        SELECT ${product_id}, ${product_name}, ${product_creationDate}, ${productExpiration_date}
            FROM ${product} 
            LEFT JOIN ${productExpiration}
                ON ${product_id} = ${productExpiration_productId}
            ORDER BY
               ${productExpiration_date} IS NULL, ${productExpiration_date}
    """.trimIndent()
}

suspend fun getAllProductsWithTotal(helper: SQLiteOpenHelper): ProductsWithTotal {
    return withContext(Dispatchers.IO) {
        val db = helper.readableDatabase
        val products = db.rawQuery(getAllProductsSql, null).use { cursor ->
            if (!cursor.moveToFirst()) return@use emptyList<ProductEntity>()

            val list = mutableListOf<ProductEntity>()
            do {
                val id = run {
                    val index = cursor.getColumnIndexOrThrow(BaseColumns._ID)
                    cursor.getLong(index)
                }

                val name = run {
                    val index =
                        cursor.getColumnIndexOrThrow(Schema.Product.COLUMN_NAME)
                    cursor.getString(index)
                }

                val creationDate = run {
                    val index =
                        cursor.getColumnIndexOrThrow(Schema.Product.COLUMN_CREATION_DATE)
                    cursor.getLong(index)
                }

                val expirationDate = run {
                    val index =
                        cursor.getColumnIndex(Schema.ProductExpiration.COLUMN_DATE)
                    if(index < 0) return@run null
                    cursor.getLongOrNull(index)
                }

                list.add(
                    ProductEntity(id, name, expirationDate, creationDate)
                )
            } while (cursor.moveToNext())

            list
        }

        ProductsWithTotal(products, products.size)
    }
}

