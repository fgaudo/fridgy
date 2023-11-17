import 'package:functionally/reader_io.dart';

typedef Food = ({
  String name,
  String? expDate,
});

typedef AddFoodCommand<ENV> = ReaderIO<ENV, void> Function(
  Food food,
);
