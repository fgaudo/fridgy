package net.gaudo.fridgy.data

import com.getcapacitor.JSObject

object EitherJS {
    fun left(value: Any?): JSObject {
        return JSObject().put("_tag", "left").put("left", value)
    }

    fun right(value: Any?): JSObject {
        return JSObject().put("_tag", "right").put("right", value)
    }
}
