import 'dart:async';

import 'package:fgaudo_functional/extensions/stream_either/do_on_either.dart';
import 'package:fgaudo_functional/extensions/stream_either/match.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/stream.dart' as S;
import 'package:fgaudo_functional/task_either.dart' as TE;
import 'package:rxdart/rxdart.dart';

import '../domain/food.dart';

sealed class FoodOverviewModel {}

final class Loading implements FoodOverviewModel {}

final class Error implements FoodOverviewModel {
  const Error(this.message);
  final String message;
}

final class FoodView {
  const FoodView({required this.name});
  final String name;
}

final class Ready implements FoodOverviewModel {
  const Ready({required this.foods});

  Ready.fromData({
    required Iterable<Food> foods,
  }) : foods = _listToView(foods);

  final Iterable<FoodView> foods;
}

sealed class Command {
  const Command();
}

final class Refresh implements Command {
  const Refresh(this.page);
  final int page;
}

final class Delete implements Command {
  const Delete(this.page);
  final int page;
}

final class FoodOverviewDependencies {
  const FoodOverviewDependencies({
    required this.foods,
    required this.delete,
    required this.fetchFoods,
    required this.logInfo,
    required this.logError,
  });

  final IO<void> Function(String) logInfo;
  final IO<void> Function(String) logError;
  final TE.TaskEither<Exception, void> delete;
  final Stream<Iterable<Food>> foods;
  final TE.TaskEither<Exception, Iterable<Food>> Function(int page) fetchFoods;
}

StreamTransformer<Command, FoodOverviewModel> init(
  FoodOverviewDependencies deps,
) =>
    StreamTransformer.fromBind(
      (command$) => MergeStream([
        deps.foods
            .doOnListen(() => deps.logInfo('Initial load of foods'))
            .doOnData(
                (foods) => deps.logInfo('Received ${foods.length} new foods'))
            .switchMap(
              (foods) => command$
                  .whereType<Refresh>()
                  .doOnData((event) => deps.logInfo('Received refresh command'))
                  .exhaustMap(
                    (refresh) => S
                        .fromTask(deps.fetchFoods(3))
                        .doOnEither(
                          left: (error) => deps.logError(error.toString()),
                          right: (foods) =>
                              deps.logInfo('Fetched ${foods.length} foods'),
                        )
                        .matchEither(
                          left: (_) => const Error(''),
                          right: (foods) => Ready.fromData(foods: foods),
                        )
                        .doOnListen(() => deps.logInfo('Start fetching foods'))
                        .startWith(Loading()),
                  )
                  .startWith(
                    Ready.fromData(foods: foods),
                  ),
            ),
        command$
            .whereType<Delete>()
            .doOnData((event) => deps.logInfo('Received delete command'))
            .flatMap((delete) => const Stream.empty()),
      ]),
    );

Iterable<FoodView> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodView(name: food.name));
