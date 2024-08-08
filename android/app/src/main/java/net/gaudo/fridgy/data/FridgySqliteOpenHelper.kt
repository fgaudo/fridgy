package net.gaudo.fridgy.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.core.database.getLongOrNull
import androidx.core.database.sqlite.transaction

private val lock = Any()


class FridgySqliteOpenHelper(
    context: Context?, name: String?, version: Int
) : SQLiteOpenHelper(context, name, null, version) {

    override fun onConfigure(db: SQLiteDatabase?) {
        super.onConfigure(db)
        db?.setForeignKeyConstraintsEnabled(true)
    }

    fun getAllProductsWithTotal(): Result<String, ProductsWithTotal> {
        val db = readableDatabase

        try {
            db.transaction(false) {

                val products = db.rawQuery(getAllProductsSql, null).use {
                    if (!it.moveToFirst()) return@use emptyList<ProductEntity>()

                    val list = mutableListOf<ProductEntity>()
                    do {
                        val id = run {
                            val index = it.getColumnIndex(Schema.ProductsTable.Columns.id)
                            if (index < 0) return Result.Error("index id not found")
                            it.getLong(index)
                        }

                        val name = run {
                            val index = it.getColumnIndex(Schema.ProductsTable.Columns.name)
                            if (index < 0) return Result.Error("index name not found")
                            it.getString(index)
                        }

                        val creationDate = run {
                            val index = it.getColumnIndex(Schema.ProductsTable.Columns.creationDate)
                            if (index < 0) return Result.Error("index creation_date not found")
                            it.getLong(index)
                        }

                        val expirationDate = run {
                            val index =
                                it.getColumnIndex(Schema.ExpirationDateTable.Columns.expirationDate)
                            if (index < 0) return Result.Error("index expirationDate not found")
                            it.getLongOrNull(index)
                        }

                        list.add(
                            ProductEntity(id, name, expirationDate, creationDate)
                        )
                    } while (it.moveToNext())

                    list
                }

                val total = db.rawQuery(getTotalSql, null).use {
                    if (!it.moveToFirst()) return Result.Error("No total available")
                    it.getLong(0)
                }

                return Result.Success(ProductsWithTotal(products, total))
            }

        } catch (e: Exception) {
            return Result.Error("There was a problem ${e.message}")
        }
    }

    fun deleteProductsByIds(ids: List<Long>): Result<String, Unit> {
        val db = writableDatabase
        try {
            db.execSQL(
                deleteProductsByIds(ids.size), ids.toTypedArray()
            )

            return Result.Success(Unit)

        } catch (e: Exception) {
            return Result.Error("There was an error: ${e.message}")

        }
    }

    fun addProduct(product: Product): Result<String, Unit> {
        val db = writableDatabase

        try {
            if (product.expirationDate == null) {
                db.execSQL(
                    addProductSql, arrayOf(product.name, product.creationDate)
                )
            } else {
                db.transaction {
                    db.execSQL(
                        addProductSql, arrayOf(product.name, product.creationDate)
                    )
                    db.execSQL(
                        addExpirationSql, arrayOf(product.expirationDate)
                    )
                }
            }

            return Result.Success(Unit)

        } catch (e: Exception) {
            return Result.Error("There was an error: ${e.message}")
        }

    }

    override fun onCreate(db: SQLiteDatabase) {
        db.transaction {
            db.execSQL(createProductsTableSql)
            db.execSQL(createExpirationDatesTableSql)
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    }
}

private val getAllProductsSql = run {
    val PRODUCTS = Schema.ProductsTable.name
    val EXPIRATION_DATES = Schema.ExpirationDateTable.name

    val PRODUCT_ID = "${PRODUCTS}.${Schema.ProductsTable.Columns.id}"
    val PRODUCT_NAME = "${PRODUCTS}.${Schema.ProductsTable.Columns.name}"
    val PRODUCT_CREATION_DATE = "${PRODUCTS}.${Schema.ProductsTable.Columns.creationDate}"
    val EXPIRATION_DATE = "${EXPIRATION_DATES}.${Schema.ExpirationDateTable.Columns.expirationDate}"
    val EXPIRATION_DATE_PRODUCT_ID =
        "${EXPIRATION_DATES}.${Schema.ExpirationDateTable.Columns.productId}"


   """
        SELECT ${PRODUCT_ID}, ${PRODUCT_NAME}, ${PRODUCT_CREATION_DATE}, ${EXPIRATION_DATE}
            FROM ${PRODUCTS} 
            LEFT JOIN ${EXPIRATION_DATES}
                ON ${PRODUCT_ID} = ${EXPIRATION_DATE_PRODUCT_ID}
            ORDER BY ${EXPIRATION_DATE} IS NULL, ${EXPIRATION_DATE}
    """.trimIndent()
}

private val getTotalSql = "SELECT COUNT(*) FROM ${Schema.ProductsTable.Columns.name}"

private val deleteProductsByIds = { numberOfTokens: Int ->
    val tokens = List(numberOfTokens) { "?" }.joinToString()

    """
        DELETE FROM ${Schema.ProductsTable.name}
            WHERE ${Schema.ProductsTable.Columns.id}
                IN (${tokens})
    """.trimIndent()
}

private val addProductSql = """
      INSERT INTO ${Schema.ProductsTable.name}
            (${Schema.ProductsTable.Columns.name}, ${Schema.ProductsTable.Columns.creationDate}) 
              VALUES (?, ?)

    """.trimIndent()

private val addExpirationSql = """
      INSERT INTO ${Schema.ExpirationDateTable.name}
            (${Schema.ExpirationDateTable.Columns.productId}, ${Schema.ExpirationDateTable.Columns.expirationDate})  
               VALUES (last_insert_rowid(), ?)
    """.trimIndent()


private val createProductsTableSql = """
        CREATE TABLE ${Schema.ProductsTable.name}(
            ${Schema.ProductsTable.Columns.id} INTEGER PRIMARY KEY ASC,
            ${Schema.ProductsTable.Columns.name} TEXT,
            ${Schema.ProductsTable.Columns.creationDate} Long
        )
    """.trimIndent()

private val createExpirationDatesTableSql = """
        CREATE TABLE ${Schema.ExpirationDateTable.name}(
            ${Schema.ExpirationDateTable.Columns.expirationDate} INTEGER,
            ${Schema.ExpirationDateTable.Columns.productId} INTEGER UNIQUE,
            FOREIGN KEY(${Schema.ExpirationDateTable.Columns.productId})
                REFERENCES ${Schema.ProductsTable.name}(${Schema.ProductsTable.Columns.id})
                ON DELETE CASCADE
        )
    """.trimIndent()