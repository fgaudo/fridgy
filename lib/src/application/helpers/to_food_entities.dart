import 'dart:async';

import '../../domain/food.dart';
import '../streams/foods.dart';

Stream<Iterable<Food>> toFoodEntities(
  Stream<Iterable<FoodData>> foods$,
) =>
    foods$.map(
      (foods) => foods.map(
        (food) => const Food(''),
      ),
    );
