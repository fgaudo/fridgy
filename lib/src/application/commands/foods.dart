import 'package:functionally/reader_stream.dart';

import '../../domain/food.dart';

final class FoodData {
  FoodData({required this.name});

  final String name;
}

typedef FoodsReader<FOODS> = ReaderStream<FOODS, Iterable<FoodData>>;

typedef Foods = Stream<Iterable<FoodData>>;

Food toFoodEntity(
  FoodData foodData,
) =>
    const Food('');
