import 'package:functionally/io.dart' as I;
import 'package:functionally/oo/reader.dart' as RX;
import 'package:functionally/oo/reader_io.dart' as RIOX;
import 'package:functionally/oo/reader_stream.dart' as RSX;
import 'package:functionally/oo/reader_task.dart' as RTX;
import 'package:functionally/reader_io.dart' as RIO;
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

typedef OverviewControllerIO = I.IO<Controller<Command, OverviewModel>>;
typedef OverviewController = Controller<Command, OverviewModel>;

typedef OverviewControllerDeps = ({
  DeleteFoodsByIds deleteByIds,
  Log log,
  Foods foods,
});

final RIO.ReaderIO<OverviewControllerDeps, OverviewController>
    overviewControllerIO = RIOX
        .make<OverviewControllerDeps>()
        .map(
          (_) => (
            RX
                .asks(
                  (OverviewControllerDeps deps) => deps.foods,
                )
                .toReaderStream()
                .asBroadcastStream()
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
                .startWith(const Loading())
                .build(),
            (Stream<Command> command$) => RSX
                .ask<OverviewControllerDeps>()
                .asBroadcastStream()
                .whereType<Delete>()
                .doOnData(
                  (delete) => _info(
                    'Received delete command',
                  ),
                )
                .flatMap(
                  (delete) => RTX
                      .asks((OverviewControllerDeps deps) => deps.deleteByIds)
                      .flatMapTask(
                        (deleteByIds) => deleteByIds(delete.ids),
                      )
                      .toReaderStream()
                      .asBroadcastStream()
                      .build(),
                )
                .doOnData(
                  (_) => _info(
                    'Delete command executed',
                  ),
                )
                .ignoreElements()
                .build(),
          ),
        )
        .flatMap(
          (streams) => RIOX
              .ask<OverviewControllerDeps>()
              .flatMapIO(
                (env) => () => Controller.withPublishSubject(
                      (Stream<Command> command$) => MergeStream([
                        streams.$1(env),
                        streams.$2(command$)(env),
                      ]),
                    ),
              )
              .build(),
        )
        .build();

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));

RIO.ReaderIO<OverviewControllerDeps, void> _info(String message) => RIOX
    .asks((OverviewControllerDeps deps) => deps.log)
    .flatMapIO(
      (log) => log(
        LogType.info,
        message,
      ),
    )
    .build();
