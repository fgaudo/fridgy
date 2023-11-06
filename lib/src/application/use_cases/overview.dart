import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/stream.dart';
import 'package:rxdart/rxdart.dart';

import '../../core/pipe.dart';
import '../../domain/food.dart';
import '../commands/delete_foods_by_ids.dart';
import '../commands/log.dart';
import '../helpers/foods.dart';
import '../streams/foods.dart';
import '../streams/pending.dart';

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
typedef OverviewPipeFactory = IO<OverviewPipe>;

OverviewPipeFactory preparePipeIO({
  required Log log,
  required DeleteFoodsByIds deleteByIds,
  required Foods$ foods$,
  required Pending$ pending,
}) =>
    () => Pipe(
          subject: PublishSubject(),
          transformer: (command$) => MergeStream([
            combineLatest2(
              toFoodEntities(foods$),
              pending,
              (foods, pending) => (
                foods: foods,
                pending: pending,
              ),
            )
                .doOnListen(
                  () => log(LogType.info, 'Initial load of foods'),
                )
                .doOnData(
                  (record) => log(
                    LogType.info,
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
                log(LogType.info, 'Received delete command');
                deleteByIds(delete.ids);
              },
            ).ignoreElements(),
          ]),
        );

Iterable<FoodModel> _listToView(Iterable<Food> foods) =>
    foods.map((food) => FoodModel(name: food.name));
