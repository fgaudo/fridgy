package net.gaudo.fridgy.data

data class Product(
    val id: Long,
    val name: String,
    val expirationDate: Long?,
    val creationDate: Long
)