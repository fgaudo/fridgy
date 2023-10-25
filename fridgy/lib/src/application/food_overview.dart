import 'dart:async';

import 'package:rxdart/rxdart.dart';

import '../core/either.dart' as e;
import '../core/reader.dart';
import '../core/stream_either.dart' as s;
import '../core/task.dart' as t;
import '../core/task_either.dart' as te;

sealed class FoodOverviewModel {}

final class Loading implements FoodOverviewModel {}

final class Error implements FoodOverviewModel {}

final class Ready implements FoodOverviewModel {
  final Iterable<FoodView> foods;

  const Ready({required this.foods});
}

sealed class Command {
  const Command();
}

final class Refresh implements Command {
  final int page;
  const Refresh(this.page);
}

final class Delete implements Command {
  final int page;
  const Delete(this.page);
}

final class Food {
  final String name;

  const Food(this.name);
}

final class FoodView {
  final String name;

  const FoodView(this.name);
}

final class FoodOverviewDependencies {
  final t.Task<void> delete;
  final te.TaskEither<Exception, Iterable<Food>> Function(int page) fetchFoods;

  const FoodOverviewDependencies({
    required this.delete,
    required this.fetchFoods,
  });
}

typedef RefreshUseCase = Reader<FoodOverviewDependencies,
    StreamTransformer<Refresh, FoodOverviewModel>>;

final RefreshUseCase _refresh = (deps) => SwitchMapStreamTransformer(
      (refresh) => s
          .fromTaskEither(
            te.sequenceTuple2(
              deps.fetchFoods(3),
              deps.fetchFoods(3),
            ),
          )
          .map(
            (event) => switch (event) {
              e.Right(value: final _) => const Ready(foods: []),
              e.Left(value: final _) => Error()
            },
          ),
    );

typedef DeleteUseCase = Reader<FoodOverviewDependencies,
    StreamTransformer<Delete, FoodOverviewModel>>;

final DeleteUseCase _delete =
    (deps) => FlatMapStreamTransformer((delete) => const Stream.empty());

typedef FoodOverviewUseCase = Reader<FoodOverviewDependencies,
    StreamTransformer<Command, FoodOverviewModel>>;

final FoodOverviewUseCase init = (deps) => StreamTransformer.fromBind(
      (command$) => MergeStream([
        _refresh(deps).bind(command$.whereType<Refresh>()),
        _delete(deps).bind(command$.whereType<Delete>()),
      ]),
    );
