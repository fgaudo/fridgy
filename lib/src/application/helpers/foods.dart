import 'dart:async';

import '../../domain/food.dart';
import '../streams/foods.dart';

final StreamTransformer<Iterable<FoodData>, Iterable<Food>> foods =
    StreamTransformer.fromBind(
  (foods$) => foods$.map(
    (foods) => foods.map(
      (food) => const Food(''),
    ),
  ),
);
