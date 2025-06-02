package net.gaudo.fridgy.data.statements

import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns
import androidx.core.database.getLongOrNull
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.gaudo.fridgy.data.schemas.Schema

data class ProductEntity(
    val id: Long,
    val name: String,
    val expirationDate: Long?,
    val creationDate: Long,
    val storage: String
)

data class GetAllProductsDto(
    val list: List<ProductEntity>,
    val total: Int
)

private val getAllProductsSql = run {
    val product = Schema.Product.TABLE_NAME
    val productExpiration = Schema.ProductExpiration.TABLE_NAME
    val storage = Schema.Storage.TABLE_NAME

    val product_id = "${product}.${BaseColumns._ID}"
    val product_name = "${product}.${Schema.Product.COLUMN_NAME}"
    val product_creationDate = "${product}.${Schema.Product.COLUMN_CREATION_DATE}"
    val product_storageId = "${product}.${Schema.Product.COLUMN_STORAGE_ID}"
    val productExpiration_date = "${productExpiration}.${Schema.ProductExpiration.COLUMN_DATE}"
    val productExpiration_productId =
        "${productExpiration}.${Schema.ProductExpiration.COLUMN_PRODUCT_ID}"
    val storage_id = "${storage}.${BaseColumns._ID}"
    val storage_name = "${storage}.${Schema.Storage.COLUMN_NAME}"

    """
        SELECT ${product_id}, ${product_name}, ${product_creationDate}, ${storage_name}, ${productExpiration_date}
            FROM ${product} 
            LEFT JOIN ${productExpiration}
                ON ${product_id} = ${productExpiration_productId}
            INNER JOIN ${storage}
                ON ${product_storageId} = ${storage_id}
            ORDER BY
               ${productExpiration_date} IS NULL, ${productExpiration_date}
    """.trimIndent()
}

suspend fun getAllProductsWithTotal(helper: SQLiteOpenHelper): GetAllProductsDto {
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
                    if (index < 0) return@run null
                    cursor.getLongOrNull(index)
                }

                val storage = run {
                    val index =
                        cursor.getColumnIndex(Schema.Product.COLUMN_NAME)
                    cursor.getString(index)
                }

                list.add(
                    ProductEntity(id, name, expirationDate, creationDate, storage)
                )
            } while (cursor.moveToNext())

            list
        }

        GetAllProductsDto(products, products.size)
    }
}

