import 'package:functionally/reader_stream.dart';

final class FoodData {
  FoodData({required this.name});

  final String name;
}

typedef Foods<FOODS> = ReaderStream<FOODS, Iterable<FoodData>>;
