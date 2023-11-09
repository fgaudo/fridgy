import 'package:fgaudo_functional/extensions/reader/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader/local.dart';
import 'package:fgaudo_functional/extensions/reader/map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/do_on_data.dart';
import 'package:fgaudo_functional/extensions/reader_stream/do_on_listen.dart';
import 'package:fgaudo_functional/extensions/reader_stream/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/flat_map_stream.dart';
import 'package:fgaudo_functional/extensions/reader_stream/ignore_elements.dart';
import 'package:fgaudo_functional/extensions/reader_stream/map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/start_with.dart';
import 'package:fgaudo_functional/extensions/reader_stream/transform_stream.dart';
import 'package:fgaudo_functional/extensions/reader_stream/where_type.dart';
import 'package:fgaudo_functional/reader.dart' as R;
import 'package:fgaudo_functional/reader_io.dart';
import 'package:fgaudo_functional/reader_stream.dart' as RS;
import 'package:rxdart/rxdart.dart';

import '../../core/commands/log.dart';
import '../../core/controller.dart';
import '../../domain/food.dart';
import '../commands/delete_foods_by_ids.dart';
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

typedef OverviewDeps<LOG, DELETE, FOODS> = ({
  LOG logEnv,
  DELETE deleteEnv,
  FOODS foodsEnv
});

typedef OverviewControllerBuilder<LOG, DELETE, FOODS>
    = ReaderIO<OverviewDeps<LOG, DELETE, FOODS>, OverviewController>;

typedef FoodsDeps<LOG, FOODS> = ({LOG logDeps, FOODS foodsDeps});

typedef DeleteDeps<LOG, DELETE> = ({LOG logDeps, DELETE deleteDeps});

OverviewControllerBuilder<LOG, DELETE, FOODS>
    getControllerReaderIO<LOG, DELETE, FOODS>({
  required Log<LOG> logReaderIO,
  required DeleteFoodsByIds<DELETE> deleteFoodsByIdsReaderIO,
  required Foods<FOODS> foodsReaderStream,
}) =>
        R.Do<OverviewDeps<LOG, DELETE, FOODS>>()
            .map(
              (_) => (
                foodsReaderStream
                    .local((FoodsDeps<LOG, FOODS> deps) => deps.foodsDeps)
                    .transformStream(
                      (foods$) => foods$.asBroadcastStream(),
                    )
                    .doOnListen(
                      logReaderIO(LogType.info, 'ciao')
                          .local((deps) => deps.logDeps),
                    )
                    .doOnData(
                      (foods) => logReaderIO(
                        LogType.info,
                        'Received ${foods.length} new foods',
                      ).local((deps) => deps.logDeps),
                    )
                    .transformStream(toFoodEntities)
                    .map<OverviewModel>(
                      (foods) => Ready.fromData(
                        foods: foods,
                        pending: 0,
                      ),
                    )
                    .startWith(const Loading())
                    .local(
                      (OverviewDeps<LOG, DELETE, FOODS> deps) =>
                          (logDeps: deps.logEnv, foodsDeps: deps.foodsEnv),
                    ),
                (Stream<Command> command$) => RS.Do<DeleteDeps<LOG, DELETE>>()
                    .flatMapStream((_) => command$)
                    .whereType<Delete>()
                    .doOnData(
                      (delete) => logReaderIO(
                        LogType.info,
                        'Received delete command',
                      ).local((deps) => deps.logDeps),
                    )
                    .flatMap(
                      (delete) => RS.fromReaderIO(
                        deleteFoodsByIdsReaderIO(delete.ids).local(
                          (deps) => deps.deleteDeps,
                        ),
                      ),
                    )
                    .ignoreElements()
                    .local(
                      (OverviewDeps<LOG, DELETE, FOODS> env) =>
                          (logDeps: env.logEnv, deleteDeps: env.deleteEnv),
                    )
              ),
            )
            .flatMap(
              (streams) => (env) => () => Controller.withPublishSubject(
                    (command$) => MergeStream([
                      streams.$1(env),
                      streams.$2(command$)(env),
                    ]),
                  ),
            );

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
