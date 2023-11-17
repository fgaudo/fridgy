import 'package:functionally/reader.dart';

import 'use_cases/log.dart';
import 'use_cases/overview.dart';

typedef AppWithDeps = ({
  OverviewControllerIOWithDeps overview,
  LogWithDeps log,
});

typedef AppDeps<OVERVIEW_FOODS, OVERVIEW_DELETE, OVERVIEW_LOG, LOG> = ({
  OverviewDeps<OVERVIEW_DELETE, OVERVIEW_LOG, OVERVIEW_FOODS> overviewEnv,
  LOG logEnv
});

typedef App<OVERVIEW_FOODS, OVERVIEW_DELETE, OVERVIEW_LOG, LOG> = Reader<
    AppDeps<OVERVIEW_FOODS, OVERVIEW_DELETE, OVERVIEW_LOG, LOG>, AppWithDeps>;

App<OVERVIEW_FOODS, OVERVIEW_DELETE, OVERVIEW_LOG, LOG>
    prepareApp<OVERVIEW_FOODS, OVERVIEW_DELETE, OVERVIEW_LOG, LOG>({
  required OverviewControllerCommands<OVERVIEW_DELETE, OVERVIEW_LOG,
          OVERVIEW_FOODS>
      overviewCommands,
  required LogCommands<LOG> logCommands,
}) =>
        (env) {
          final log = prepareLog((log: logCommands.log));

          return (
            overview: overviewControllerIO(
              (
                foods: overviewCommands.foods,
                deleteByIds: overviewCommands.deleteByIds,
                log: overviewCommands.log,
              ),
            )(env.overviewEnv),
            log: (
              debug: (s) => log.debug(s)(env.logEnv),
              info: (s) => log.info(s)(env.logEnv),
              error: (s) => log.error(s)(env.logEnv),
            )
          );
        };
