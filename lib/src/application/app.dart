import 'package:functionally/reader.dart';

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
  required OverviewControllerCommands<DELETE_BY_IDS, APP_LOG, FOODS>
      overviewCommands,
  required LogCommands<UI_LOG> logCommands,
}) =>
        (env) {
          final logF = prepareLog((log: logCommands.log));
          return (
            overview: overviewControllerIO(overviewCommands)(
              (
                deleteEnv: env.deleteByIdsEnv,
                logEnv: env.appLogEnv,
                foodsEnv: env.foodsEnv
              ),
            ),
            log: (
              debug: (message) => logF.debug(message)(env.uiLogEnv),
              error: (message) => logF.error(message)(env.uiLogEnv),
              info: (message) => logF.info(message)(env.uiLogEnv)
            )
          );
        };
