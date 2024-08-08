package net.gaudo.fridgy.data

data class ProductsWithTotal(
    val list: List<ProductEntity>,
    val total: Int
)
