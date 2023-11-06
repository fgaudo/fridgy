import 'dart:async';

import '../../domain/food.dart';
import '../streams/foods.dart';

Stream<Iterable<Food>> toFoodEntities(
  Foods$ foods$,
) =>
    foods$.map(
      (foods) => foods.map(
        (food) => const Food(''),
      ),
    );
