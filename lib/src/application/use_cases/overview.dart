import 'dart:async';

import 'package:fgaudo_functional/reader_io.dart';
import 'package:fgaudo_functional/stream.dart';
import 'package:rxdart/rxdart.dart';

import '../../core/pipe.dart';
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

typedef OverviewPipe = Pipe<Command, OverviewModel>;

ReaderIO<({LOG logEnv, DELETE deleteByIdsEnv, FOODS foodsEnv}), OverviewPipe>
    preparePipeIO<LOG, DELETE, FOODS>({
  required Log<LOG> log,
  required DeleteFoodsByIds<DELETE> deleteByIds,
  required Foods$<FOODS> foods$,
}) =>
        (env) {
          final logInfo = (String s) => log(LogType.info, s)(env.logEnv);

          return () => Pipe(
                subject: PublishSubject(),
                transformer: (command$) => MergeStream([
                  foods$(env.foodsEnv)
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
                          deleteByIds(delete.ids)(env.deleteByIdsEnv),
                        ),
                      )
                      .ignoreElements(),
                ]).asBroadcastStream(),
              );
        };

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
