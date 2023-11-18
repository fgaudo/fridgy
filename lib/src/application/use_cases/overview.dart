import 'package:functionally/extensions/io/flat_map.dart';
import 'package:functionally/extensions/io/map.dart';
import 'package:functionally/io.dart';
import 'package:rxdart/rxdart.dart';

import '../../core/controller.dart';
import '../../domain/food.dart';
import '../commands/delete_foods_by_ids.dart';
import '../commands/foods.dart';
import '../commands/log.dart';

sealed class OverviewModel {}

final class Loading implements OverviewModel {
  const Loading();
}

final class Error implements OverviewModel {
  const Error(this.message);
  final String message;
}

final class FoodModel {
  const FoodModel({required this.name});
  final String name;
}

final class Ready implements OverviewModel {
  const Ready({
    required this.foods,
    required this.pending,
  });

  Ready.fromData({
    required Iterable<Food> foods,
    required this.pending,
  }) : foods = _listToView(foods);

  final int pending;
  final Iterable<FoodModel> foods;
}

sealed class Command {
  const Command();
}

final class Refresh implements Command {
  const Refresh(this.page);
  final int page;
}

final class Delete implements Command {
  const Delete(this.ids);

  final Set<String> ids;
}

typedef OverviewControllerIOWithDeps = IO<Controller<Command, OverviewModel>>;

OverviewControllerIOWithDeps overviewControllerIO({
  required DeleteFoodsByIdsWithDeps deleteByIds,
  required LogCommandWithDeps log,
  required FoodsWithDeps foods,
}) =>
    (() {})
        .map(
          (_) => (
            foods
                .asBroadcastStream()
                .doOnListen(
                  log.info('Started listening to foods'),
                )
                .doOnData(
                  (foods) => log.info(
                    'Received ${foods.length} food entries',
                  )(),
                )
                .map((foods) => foods.map(toFoodEntity))
                .map<OverviewModel>(
                  (foods) => Ready.fromData(
                    foods: foods,
                    pending: 0,
                  ),
                )
                .startWith(const Loading()),
            (Stream<Command> command$) => command$
                .whereType<Delete>()
                .doOnData(
                  (delete) => log.info(
                    'Received delete command',
                  )(),
                )
                .flatMap(
                  (delete) => FromCallableStream(
                    deleteByIds(delete.ids),
                  ),
                )
                .doOnData(
                  (_) => log.info(
                    'Delete command executed',
                  )(),
                )
                .ignoreElements(),
          ),
        )
        .flatMap(
          (streams) => () => Controller.withPublishSubject(
                (Stream<Command> command$) => MergeStream([
                  streams.$1,
                  streams.$2(command$),
                ]),
              ),
        );

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
