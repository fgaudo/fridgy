import 'commands/delete_foods_by_ids.dart';
import 'commands/execute.dart';
import 'commands/foods.dart';
import 'commands/log.dart';
import 'commands/retrieve.dart';
import 'flow/overview.dart';

typedef App = ({
  OverviewControllerIO overview,
  Retrieve retrieve,
  Execute execute,
  Log log,
});

App prepareApp({
  required DeleteFoodsByIds deleteFoodsByIds,
  required Foods foods,
  required Log appLog,
  required Log uiLog,
  required Retrieve retrieve,
  required Execute execute,
}) =>
    (
      overview: overviewControllerIO(
        (
          deleteByIds: deleteFoodsByIds,
          foods: foods,
          log: appLog,
        ),
      ),
      log: uiLog,
      retrieve: retrieve,
      execute: execute
    );
