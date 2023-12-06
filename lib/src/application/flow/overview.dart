import 'package:functionally/extensions/reader.dart';
import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/extensions/reader_stream.dart';
import 'package:functionally/io.dart';
import 'package:functionally/reader.dart' as R;
import 'package:functionally/reader_io.dart' as RIO;
import 'package:functionally/reader_stream.dart' as RS;
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

typedef OverviewControllerIO = IO<Controller<Command, OverviewModel>>;
typedef OverviewController = Controller<Command, OverviewModel>;

typedef OverviewControllerDeps = ({
  DeleteFoodsByIds deleteByIds,
  Log log,
  Foods foods,
});

final RIO.ReaderIO<OverviewControllerDeps, OverviewController>
    overviewControllerIO = RIO
        .make<OverviewControllerDeps>()
        .map(
          (_) => (
            R
                .asks(
                  (OverviewControllerDeps deps) =>
                      deps.foods.asBroadcastStream(),
                )
                .toReaderStream()
                .doOnListen(
                  _info('Started listening to foods'),
                )
                .doOnData(
                  (foods) => _info('Received ${foods.length} food entries'),
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
                .ask<OverviewControllerDeps>()
                .flatMapStream((_) => command$)
                .whereType<Delete>()
                .doOnData(
                  (delete) => _info(
                    'Received delete command',
                  ),
                )
                .flatMap(
                  (delete) => RIO
                      .asks((OverviewControllerDeps deps) => deps.deleteByIds)
                      .flatMapIO(
                        (deleteByIds) => deleteByIds(delete.ids),
                      )
                      .toReaderStream(),
                )
                .doOnData(
                  (_) => _info(
                    'Delete command executed',
                  ),
                )
                .ignoreElements(),
          ),
        )
        .flatMap(
          (streams) => RIO.ReaderIO(
            (OverviewControllerDeps env) => () => Controller.withPublishSubject(
                  (Stream<Command> command$) => MergeStream([
                    streams.$1(env),
                    streams.$2(command$)(env),
                  ]),
                ),
          ),
        );

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));

RIO.ReaderIO<OverviewControllerDeps, void> _info(String message) =>
    RIO.asks((OverviewControllerDeps deps) => deps.log).flatMapIO(
          (log) => log(
            LogType.info,
            message,
          ),
        );
