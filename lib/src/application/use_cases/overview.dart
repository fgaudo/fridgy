import 'package:functionally/extensions/reader/map.dart';
import 'package:functionally/extensions/reader/to_reader_stream.dart';
import 'package:functionally/extensions/reader_io/flat_map.dart';
import 'package:functionally/extensions/reader_io/flat_map_io.dart';
import 'package:functionally/extensions/reader_io/map.dart';
import 'package:functionally/extensions/reader_stream/do_on_data.dart';
import 'package:functionally/extensions/reader_stream/do_on_listen.dart';
import 'package:functionally/extensions/reader_stream/flat_map.dart';
import 'package:functionally/extensions/reader_stream/flat_map_stream.dart';
import 'package:functionally/extensions/reader_stream/ignore_elements.dart';
import 'package:functionally/extensions/reader_stream/map.dart';
import 'package:functionally/extensions/reader_stream/start_with.dart';
import 'package:functionally/extensions/reader_stream/where_type.dart';
import 'package:functionally/reader.dart' as R;
import 'package:functionally/reader_io.dart' as RIO;
import 'package:functionally/reader_stream.dart' as RS;
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

typedef OverviewDeps = ({
  Log log,
  DeleteFoodsByIds deleteFoodsByIds,
  Foods foods$
});

typedef OverviewControllerBuilder
    = RIO.ReaderIO<OverviewDeps, OverviewController>;

final OverviewControllerBuilder getControllerReaderIO = RIO
    .ask<OverviewDeps>()
    .map(
      (_) => (
        R
            .asks((OverviewDeps deps) => deps.foods$)
            .map(
              (foods$) => foods$.asBroadcastStream(),
            )
            .toReaderStream()
            .doOnListen(
              RIO
                  .asks(
                    (OverviewDeps deps) => deps.log,
                  )
                  .flatMapIO(
                    (log) => log(LogType.info, 'Started listening to foods'),
                  ),
            )
            .doOnData(
              (foods) => RIO
                  .asks(
                    (OverviewDeps deps) => deps.log,
                  )
                  .flatMapIO(
                    (log) => log(
                      LogType.info,
                      'Received ${foods.length} food entries',
                    ),
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
            .ask<OverviewDeps>()
            .flatMapStream((_) => command$)
            .whereType<Delete>()
            .doOnData(
              (delete) => RIO
                  .asks(
                    (OverviewDeps deps) => deps.log,
                  )
                  .flatMapIO(
                    (log) => log(LogType.info, 'Received delete command'),
                  ),
            )
            .flatMap(
              (delete) => RS.fromReaderIO(
                RIO
                    .asks(
                      (OverviewDeps deps) => deps.deleteFoodsByIds,
                    )
                    .flatMapIO(
                      (deleteFoodsByIds) => deleteFoodsByIds(delete.ids),
                    ),
              ),
            )
            .doOnData(
              (_) => RIO
                  .asks(
                    (OverviewDeps deps) => deps.log,
                  )
                  .flatMapIO(
                    (log) => log(LogType.info, 'Delete command executed'),
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
