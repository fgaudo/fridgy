import 'dart:async';

import 'package:rxdart/rxdart.dart';

import '../core/stream_either.dart' as SE;
import '../core/task.dart' as T;
import '../core/task_either.dart' as TE;
import '../domain/food.dart';

sealed class FoodOverviewModel {}

final class Loading implements FoodOverviewModel {}

final class Error implements FoodOverviewModel {
  const Error(this.message);
  final String message;
}

final class FoodView {
  const FoodView(this.name);
  final String name;
}

final class Ready implements FoodOverviewModel {
  const Ready({required this.foods});
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
    required this.delete,
    required this.fetchFoods,
  });
  final T.Task<void> delete;
  final TE.TaskEither<Exception, Iterable<Food>> Function(int page) fetchFoods;
}

StreamTransformer<Command, FoodOverviewModel> init(
  FoodOverviewDependencies deps,
) =>
    StreamTransformer.fromBind(
      (command$) => MergeStream([
        _refresh(deps).bind(command$.whereType<Refresh>()),
        _delete(deps).bind(command$.whereType<Delete>()),
      ]),
    );

StreamTransformer<Refresh, FoodOverviewModel> _refresh(
  FoodOverviewDependencies deps,
) =>
    SwitchMapStreamTransformer(
      (refresh) => SE.fromTaskEither(deps.fetchFoods(3)).transform(
            SE.FoldEitherStreamTransformer(
              right: (event) => const Ready(foods: []),
              left: (event) => const Error(''),
            ),
          ),
    );

StreamTransformer<Delete, FoodOverviewModel> _delete(
  FoodOverviewDependencies deps,
) =>
    FlatMapStreamTransformer((delete) => const Stream.empty());
