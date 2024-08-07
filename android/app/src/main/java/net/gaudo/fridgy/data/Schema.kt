package net.gaudo.fridgy.data


object Schema {
    object ProductsTable {
        const val name = "products"

        object Columns {
            const val id = "id"
            const val name = "name"
            const val creationDate = "creation_date"
        }
    }

    object ExpirationDateTable {
        const val name = "expiration_dates"

        object Columns {
            const val expirationDate = "expiration_date"
            const val productId = "product_id"
        }
    }
}