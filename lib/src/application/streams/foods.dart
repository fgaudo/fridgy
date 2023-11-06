final class FoodData {
  FoodData({required this.name});

  final String name;
}

typedef Foods$ = Stream<Iterable<FoodData>>;
