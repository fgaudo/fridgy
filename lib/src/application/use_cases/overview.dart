import 'dart:async';

import 'package:fgaudo_functional/extensions/reader/local.dart';
import 'package:fgaudo_functional/extensions/reader/map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/do_on_data_reader.dart';
import 'package:fgaudo_functional/extensions/reader_stream/do_on_listen_reader.dart';
import 'package:fgaudo_functional/extensions/reader_stream/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/ignore_elements.dart';
import 'package:fgaudo_functional/extensions/reader_stream/map.dart';
import 'package:fgaudo_functional/extensions/reader_stream/start_with.dart';
import 'package:fgaudo_functional/extensions/reader_stream/transform_stream.dart';
import 'package:fgaudo_functional/extensions/reader_stream/where_type.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:fgaudo_functional/reader_stream.dart';
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
typedef OverviewDeps<LOG, DELETE, FOODS> = ({
  LOG logDeps,
  DELETE deleteDeps,
  FOODS foodsDeps
});
ReaderIO<OverviewDeps<LOG, DELETE, FOODS>, OverviewController>
    prepareControllerIO<LOG, DELETE, FOODS>({
  required Log<LOG> log,
  required DeleteFoodsByIds<DELETE> deleteByIds,
  required Foods<FOODS> foods,
}) =>
        (env) => () => Controller.withPublishSubject(
              (command$) => MergeStream(
                [
                  foodsCase(foods: foods, log: log).local(
                    (OverviewDeps<LOG, DELETE, FOODS> deps) =>
                        (logDeps: deps.logDeps, foodsDeps: deps.foodsDeps),
                  )(env),
                  deleteCase(
                    command$: command$,
                    deleteByIds: deleteByIds,
                    log: log,
                  ).local(
                    (OverviewDeps<LOG, DELETE, FOODS> env) =>
                        (logDeps: env.logDeps, deleteDeps: env.deleteDeps),
                  )(env),
                ],
              ),
            );

ReaderStream<({LOG logDeps, FOODS foodsDeps}), OverviewModel>
    foodsCase<LOG, FOODS>({
  required Foods<FOODS> foods,
  required Log<LOG> log,
}) =>
        MapReaderExtension(
          foods.local(
            (({LOG logDeps, FOODS foodsDeps}) deps) => deps.foodsDeps,
          ),
        )
            .map((foods$) => foods$.asBroadcastStream())
            .doOnListenReader(
              log(LogType.info, 'ciao').local((deps) => deps.logDeps),
            )
            .doOnDataReader(
              (foods) => log(
                LogType.info,
                'Received ${foods.length} new foods',
              ).local((deps) => deps.logDeps),
            )
            .transformStream(
              StreamTransformer.fromBind(toFoodEntities),
            )
            .map<OverviewModel>(
              (foods) => Ready.fromData(
                foods: foods,
                pending: 0,
              ),
            )
            .startWith(const Loading());

ReaderStream<({LOG logDeps, DELETE deleteDeps}), Never>
    deleteCase<LOG, DELETE>({
  required Stream<Command> command$,
  required DeleteFoodsByIds<DELETE> deleteByIds,
  required Log<LOG> log,
}) =>
        ((({LOG logDeps, DELETE deleteDeps}) env) => command$)
            .whereType<Delete>()
            .doOnDataReader(
              (delete) => log(LogType.info, 'Received delete command').local(
                (deps) => deps.logDeps,
              ),
            )
            .flatMap(
              (delete) => fromReaderIO(
                deleteByIds(delete.ids).local(
                  (deps) => deps.deleteDeps,
                ),
              ),
            )
            .ignoreElements();

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
