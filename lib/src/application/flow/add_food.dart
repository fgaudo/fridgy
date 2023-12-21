import 'package:functionally/common.dart';
import 'package:functionally/io.dart';
import 'package:functionally/option.dart';
import 'package:functionally/reader_io.dart' as RIO;

import '../commands/add_food.dart';

sealed class AddFoodModel {}

final class Empty implements AddFoodModel {}

final class ValidationError implements AddFoodModel {
  const ValidationError({
    required this.nameError,
    required this.expDateError,
  });

  final Option<String> nameError;
  final Option<String> expDateError;
}

typedef AddFoodModelInput = ({
  String? name,
  String? expDate,
});

typedef AddFood<ENV> = RIO.ReaderIO<ENV, AddFoodModel> Function(
    AddFoodModelInput);
typedef AddFoodWithDeps = IO<AddFoodModel> Function(AddFoodModelInput);

AddFood<ENV> prepareAddFood<ENV>({
  required AddFoodCommand<ENV> addFood,
}) =>
    (input) => Builder(
          addFood(
            (
              name: input.name ?? 'undefined',
              expDate: input.expDate,
            ),
          ),
        )
            .transform(
              RIO.map(
                (_) => Empty(),
              ),
            )
            .build();
