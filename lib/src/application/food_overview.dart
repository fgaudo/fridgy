import 'dart:async';

import 'package:fgaudo_functional/io.dart';
import 'package:rxdart/rxdart.dart';
import 'package:uuid/uuid.dart';

import '../core/pipe.dart';
import '../domain/food.dart';

sealed class FoodOverviewModel {}

final class Loading implements FoodOverviewModel {
  const Loading();
}

final class Error implements FoodOverviewModel {
  const Error(this.message);
  final String message;
}

final class FoodView {
  const FoodView({required this.name});
  final String name;
}

final class Ready implements FoodOverviewModel {
  const Ready({
    required this.foods,
    required this.pending,
  });

  Ready.fromData({
    required Iterable<Food> foods,
    required this.pending,
  }) : foods = _listToView(foods);

  final int pending;
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
  const Delete(this.ids);

  final Set<Uuid> ids;
}

final class FoodOverviewDependencies {
  const FoodOverviewDependencies({
    required this.pending,
    required this.foods,
    required this.deleteByIds,
    required this.logInfo,
    required this.logError,
  });

  final IO<void> Function(String) logInfo;
  final IO<void> Function(String) logError;
  final IO<void> Function(Set<Uuid> ids) deleteByIds;
  final Stream<Iterable<Food>> foods;
  final Stream<int> pending;
}

IO<Pipe<Command, FoodOverviewModel>> preparePipe(
  FoodOverviewDependencies deps,
) =>
    () => Pipe(
          subject: PublishSubject(),
          transformer: StreamTransformer.fromBind(
            (command$) => MergeStream([
              CombineLatestStream(
                [deps.foods, deps.pending],
                (values) => (
                  foods: values[0] as Iterable<Food>,
                  pending: values[1] as int,
                ),
              )
                  .doOnListen(() => deps.logInfo('Initial load of foods'))
                  .doOnData(
                    (record) => deps
                        .logInfo('Received ${record.foods.length} new foods'),
                  )
                  .map<FoodOverviewModel>(
                    (record) => Ready.fromData(
                      foods: record.foods,
                      pending: record.pending,
                    ),
                  )
                  .startWith(const Loading()),
              command$.whereType<Delete>().doOnData(
                (delete) {
                  deps.logInfo('Received delete command');
                  deps.deleteByIds(delete.ids);
                },
              ).ignoreElements(),
            ]),
          ),
        );

Iterable<FoodView> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodView(name: food.name));
