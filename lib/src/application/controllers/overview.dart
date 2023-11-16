import 'package:functionally/extensions/reader.dart';
import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/extensions/reader_stream.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:functionally/reader_stream.dart' as RS;
import 'package:rxdart/rxdart.dart';

import '../../core/controller.dart';
import '../../domain/food.dart';
import '../commands/delete_foods_by_ids.dart';
import '../commands/log.dart';
import '../helpers/to_food_entities.dart';
import '../streams/foods.dart';

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

typedef OverviewDeps<DELETE, LOG, FOODS> = ({
  LOG logEnv,
  DELETE deleteEnv,
  FOODS foodsEnv
});

RIO.ReaderIO<OverviewDeps<DELETE, LOG, FOODS>,
    OverviewController> getControllerReaderIO<DELETE, LOG, FOODS>({
  required DeleteFoodsByIds<DELETE> deleteByIds,
  required Log<LOG> log,
  required Foods<FOODS> foods,
}) =>
    RIO
        .ask<OverviewDeps<DELETE, LOG, FOODS>>()
        .map(
          (_) => (
            foods
                .local((OverviewDeps<DELETE, LOG, FOODS> deps) => deps.foodsEnv)
                .toReader()
                .map(
                  (foods$) => foods$.asBroadcastStream(),
                )
                .toReaderStream()
                .doOnListen(
                  log
                      .info('Started listening to foods')
                      .local((deps) => deps.logEnv),
                )
                .doOnData(
                  (foods) =>
                      RIO.ask<OverviewDeps<DELETE, LOG, FOODS>>().flatMap(
                            (_) => log
                                .info(
                                  'Received ${foods.length} food entries',
                                )
                                .local((deps) => deps.logEnv),
                          ),
                )
                .map((foods) => foods.map(toFoodEntity))
                .map<OverviewModel>(
                  (foods) => Ready.fromData(
                    foods: foods,
                    pending: 0,
                  ),
                )
                .startWith(const Loading()),
            (Stream<Command> command$) => RS
                .ask<OverviewDeps<DELETE, LOG, FOODS>>()
                .flatMapStream((_) => command$)
                .whereType<Delete>()
                .doOnData(
                  (delete) =>
                      RIO.ask<OverviewDeps<DELETE, LOG, FOODS>>().flatMap(
                            (_) => log
                                .info(
                                  'Received delete command',
                                )
                                .local(
                                  (deps) => deps.logEnv,
                                ),
                          ),
                )
                .flatMap(
                  (delete) => RS.fromReaderIO(
                    RIO.ask<OverviewDeps<DELETE, LOG, FOODS>>().flatMap(
                          (deleteFoodsByIds) => deleteByIds(delete.ids).local(
                            (deps) => deps.deleteEnv,
                          ),
                        ),
                  ),
                )
                .doOnData(
                  (_) => RIO.ask<OverviewDeps<DELETE, LOG, FOODS>>().flatMap(
                        (_) => log
                            .info(
                              'Delete command executed',
                            )
                            .local(
                              (deps) => deps.logEnv,
                            ),
                      ),
                )
                .ignoreElements(),
          ),
        )
        .flatMap(
          (streams) => RIO.ReaderIO(
            (env) => () => Controller.withPublishSubject(
                  (command$) => MergeStream([
                    streams.$1(env),
                    streams.$2(command$)(env),
                  ]),
                ),
          ),
        );

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
