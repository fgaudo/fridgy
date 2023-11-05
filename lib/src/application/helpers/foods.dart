import 'dart:async';

import '../../domain/food.dart';
import '../streams/foods.dart';

Stream<Iterable<Food>> foods(
  Foods$ foods$,
) =>
    foods$.map(
      (foods) => foods.map(
        (food) => const Food(''),
      ),
    );
