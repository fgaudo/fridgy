import 'package:functionally/reader.dart';

import 'commands/delete_foods_by_ids.dart';
import 'commands/foods.dart';
import 'commands/log.dart';
import 'use_cases/log.dart';
import 'use_cases/overview.dart';

typedef AppWithDeps = ({
  OverviewControllerIOWithDeps overview,
  LogWithDeps log,
});

typedef AppDeps<DELETE_BY_IDS, FOODS, APP_LOG, UI_LOG> = ({
  DELETE_BY_IDS deleteByIdsEnv,
  FOODS foodsEnv,
  APP_LOG appLogEnv,
  UI_LOG uiLogEnv,
});

Reader<AppDeps<DELETE_BY_IDS, FOODS, APP_LOG, UI_LOG>, AppWithDeps>
    prepareApp<DELETE_BY_IDS, FOODS, APP_LOG, UI_LOG>({
  required DeleteFoodsByIds<DELETE_BY_IDS> deleteFoodsByIds,
  required Foods<FOODS> foods,
  required LogCommand<APP_LOG> appLog,
  required LogCommand<UI_LOG> uiLog,
}) =>
        (env) {
          final (
            debug: debug,
            info: info,
            error: error,
          ) = prepareLog(log: uiLog);

          return (
            overview: overviewControllerIO(
              deleteByIds: deleteFoodsByIds,
              foods: foods,
              log: appLog,
            )(
              (
                deleteEnv: env.deleteByIdsEnv,
                logEnv: env.appLogEnv,
                foodsEnv: env.foodsEnv
              ),
            ),
            log: (
              debug: (message) => debug(message)(env.uiLogEnv),
              error: (message) => error(message)(env.uiLogEnv),
              info: (message) => info(message)(env.uiLogEnv)
            )
          );
        };
