import 'package:functionally/reader_stream.dart';

import '../../domain/food.dart';

final class FoodData {
  FoodData({required this.name});

  final String name;
}

Food toFoodEntity(
  FoodData foodData,
) =>
    const Food('');

typedef Foods<FOODS> = ReaderStream<FOODS, Iterable<FoodData>>;

typedef FoodsWithDeps = Stream<Iterable<FoodData>>;
