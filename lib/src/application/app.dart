import 'package:functionally/reader.dart';

import 'controllers/overview.dart';
import 'use_cases/delete_foods_by_ids.dart';
import 'use_cases/foods.dart';
import 'use_cases/log.dart';

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
  required ({
    DeleteFoodsByIds<OVERVIEW_DELETE> deleteByIds,
    Log<OVERVIEW_LOG> log,
    Foods<OVERVIEW_FOODS> foods,
  }) overview,
  required Log<LOG> log,
}) =>
        (env) => (
              overview: overviewControllerIO(
                foods: overview.foods,
                deleteByIds: overview.deleteByIds,
                log: overview.log,
              )(env.overviewEnv),
              log: (
                info: (s) => log.info(s)(env.logEnv),
                error: (s) => log.error(s)(env.logEnv),
                debug: (s) => log.debug(s)(env.logEnv),
              )
            );
