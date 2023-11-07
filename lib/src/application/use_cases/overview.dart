import 'dart:async';

import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/stream.dart';
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

IO<OverviewController> prepareControllerIO<LOG, DELETE, FOODS>({
  required ({LOG env, Log<LOG> function}) log,
  required ({DELETE env, DeleteFoodsByIds<DELETE> function}) deleteByIds,
  required ({FOODS env, Foods$<FOODS> stream}) foods,
}) {
  final logInfo = (String s) => log.function(LogType.info, s)(log.env);
  final foods$ = foods.stream(foods.env).asBroadcastStream();
  final deleteFoodsByIds =
      (Set<String> ids) => deleteByIds.function(ids)(deleteByIds.env);

  return () => Controller.publishSubject(
        (command$) => MergeStream([
          foods$
              .transform(
                StreamTransformer.fromBind(toFoodEntities),
              )
              .doOnListen(
                () => logInfo('Initial load of foods'),
              )
              .doOnData(
                (foods) => logInfo(
                  'Received ${foods.length} new foods',
                ),
              )
              .map<OverviewModel>(
                (foods) => Ready.fromData(
                  foods: foods,
                  pending: 0,
                ),
              )
              .startWith(
                const Loading(),
              ),
          command$
              .whereType<Delete>()
              .doOnData(
                (delete) => logInfo('Received delete command'),
              )
              .flatMap(
                (delete) => fromIO(
                  deleteFoodsByIds(delete.ids),
                ),
              )
              .ignoreElements(),
        ]).asBroadcastStream(),
      );
}

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
