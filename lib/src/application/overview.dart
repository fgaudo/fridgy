import 'dart:async';

import 'package:fgaudo_functional/io.dart';
import 'package:rxdart/rxdart.dart';
import 'package:uuid/uuid.dart';

import '../core/pipe.dart';
import '../domain/food.dart';

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

  final Set<Uuid> ids;
}

typedef OverviewPipe = Pipe<Command, OverviewModel>;
typedef OverviewPipeFactory = IO<OverviewPipe>;

OverviewPipeFactory preparePipeFactory({
  required IO<void> Function(String) logInfo,
  required IO<void> Function(String) logError,
  required IO<void> Function(Set<Uuid> ids) deleteByIds,
  required Stream<Iterable<Food>> foods,
  required Stream<int> pending,
}) =>
    () => Pipe(
          subject: PublishSubject(),
          transformer: StreamTransformer.fromBind(
            (command$) => MergeStream([
              CombineLatestStream(
                [foods, pending],
                (values) => (
                  foods: values[0] as Iterable<Food>,
                  pending: values[1] as int,
                ),
              )
                  .doOnListen(
                    () => logInfo('Initial load of foods'),
                  )
                  .doOnData(
                    (record) => logInfo(
                      'Received ${record.foods.length} new foods',
                    ),
                  )
                  .map<OverviewModel>(
                    (record) => Ready.fromData(
                      foods: record.foods,
                      pending: record.pending,
                    ),
                  )
                  .startWith(
                    const Loading(),
                  ),
              command$.whereType<Delete>().doOnData(
                (delete) {
                  logInfo('Received delete command');
                  deleteByIds(delete.ids);
                },
              ).ignoreElements(),
            ]),
          ),
        );

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
