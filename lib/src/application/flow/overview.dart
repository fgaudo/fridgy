import 'package:functionally/common.dart';
import 'package:functionally/reader.dart' as R;
import 'package:functionally/reader_stream.dart' as RS;
import 'package:functionally/stream.dart';
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

typedef OverviewController = Controller<Command, OverviewModel>;

typedef OverviewControllerDeps = ({
  DeleteFoodsByIds deleteByIds,
  Log log,
  Foods foods,
});

final R.Reader<OverviewControllerDeps, OverviewController> overviewController =
    Builder(R.ask<OverviewControllerDeps>())
        .transform(
          R.map_(
            (_) => (
              Builder(
                R.asks(
                  (OverviewControllerDeps deps) => deps.foods,
                ),
              )
                  .transform(
                    R.flatMap(
                      (stream) => (deps) => stream.doOnListen(
                            deps.log(
                              LogType.info,
                              'Started listening to foods',
                            ),
                          ),
                    ),
                  )
                  .transform(
                    R.flatMap(
                      (stream) => (deps) => stream.doOnData(
                            (foods) => deps.log(
                              LogType.info,
                              'Received ${foods.length} food entries',
                            ),
                          ),
                    ),
                  )
                  .transform(
                    RS.map_(
                      (foods) => foods.map(toFoodEntity),
                    ),
                  )
                  .transform(
                    RS.map_(
                      // ignore: unnecessary_cast
                      (foods) => Ready.fromData(
                        foods: foods,
                        pending: 0,
                      ) as OverviewModel,
                    ),
                  )
                  .transform(
                    R.map_(
                      (stream) => stream.startWith(const Loading()),
                    ),
                  )
                  .build(),
              (Stream<Command> command$) =>
                  Builder(RS.ask<OverviewControllerDeps>())
                      .transform(
                        R.map_(
                          (_) =>
                              command$.asBroadcastStream().whereType<Delete>(),
                        ),
                      )
                      .transform(
                        R.flatMap(
                          (stream) => (deps) => stream.doOnData(
                                (_) => deps.log(
                                  LogType.info,
                                  'Received delete command',
                                ),
                              ),
                        ),
                      )
                      .transform(
                        R.flatMap(
                          (stream) => (deps) => stream.flatMap(
                                (delete) => fromTask(
                                  deps.deleteByIds(delete.ids),
                                ),
                              ),
                        ),
                      )
                      .transform(
                        R.flatMap(
                          (stream) => (deps) => stream.doOnData(
                                (_) => deps.log(
                                  LogType.info,
                                  'Delete command executed',
                                ),
                              ),
                        ),
                      )
                      .transform(
                        R.map_((stream) => stream.ignoreElements()),
                      )
                      .build(),
            ),
          ),
        )
        .transform(
          R.flatMap(
            (streams) => (env) => Controller.withPublishSubject(
                  (Stream<Command> command$) => MergeStream([
                    streams.$1(env),
                    streams.$2(command$)(env),
                  ]),
                ),
          ),
        )
        .build();

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
