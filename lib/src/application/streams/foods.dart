import 'package:fgaudo_functional/reader.dart';

final class FoodData {
  FoodData({required this.name});

  final String name;
}

typedef Foods<ENV> = Reader<ENV, Stream<Iterable<FoodData>>>;
