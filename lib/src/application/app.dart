import 'commands/delete_foods_by_ids.dart';
import 'commands/foods.dart';
import 'commands/log.dart';
import 'use_cases/log.dart';
import 'use_cases/overview.dart';

typedef App = ({
  OverviewControllerIO overview,
  Log log,
});

App prepareApp<DELETE_BY_IDS, FOODS, APP_LOG, UI_LOG>({
  required ({
    DeleteFoodsByIdsReader<DELETE_BY_IDS> execute,
    DELETE_BY_IDS env
  }) deleteFoodsByIds,
  required ({FoodsReader<FOODS> execute, FOODS env}) foods,
  required ({LogCommandReader<APP_LOG> execute, APP_LOG env}) appLog,
  required ({LogCommandReader<UI_LOG> execute, UI_LOG env}) uiLog,
}) {
  final (
    debug: debug,
    info: info,
    error: error,
  ) = prepareLog(
    log: (
      info: (s) => uiLog.execute.info(s)(uiLog.env),
      error: (s) => uiLog.execute.error(s)(uiLog.env),
      debug: (s) => uiLog.execute.debug(s)(uiLog.env),
    ),
  );

  return (
    overview: overviewControllerIO(
      deleteByIds: (s) => deleteFoodsByIds.execute(s)(deleteFoodsByIds.env),
      foods: foods.execute(foods.env),
      log: (
        info: (s) => appLog.execute.info(s)(appLog.env),
        error: (s) => appLog.execute.error(s)(appLog.env),
        debug: (s) => appLog.execute.debug(s)(appLog.env),
      ),
    ),
    log: (debug: debug, error: error, info: info)
  );
}
