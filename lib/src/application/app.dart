import 'package:functionally/reader.dart';

import 'commands/delete_foods_by_ids.dart';
import 'commands/foods.dart';
import 'commands/log.dart' as logCommand;
import 'use_cases/log.dart' as logUsecase;
import 'use_cases/overview.dart';

typedef App = ({
  OverviewControllerIO overview,
  logUsecase.Log log,
});

Reader<
    ({
      DELETE_BY_IDS deleteByIds,
      FOODS foods,
      APP_LOG appLog,
      UI_LOG uiLog,
    }),
    App> prepareApp<DELETE_BY_IDS, FOODS, APP_LOG, UI_LOG>({
  required DeleteFoodsByIdsReader<DELETE_BY_IDS> deleteFoodsByIds,
  required FoodsReader<FOODS> foods,
  required logCommand.LogCommandReader<APP_LOG> appLog,
  required logCommand.LogCommandReader<UI_LOG> uiLog,
}) =>
    (env) => (
          overview: overviewControllerIO(
            (
              deleteByIds: (ids) => deleteFoodsByIds(ids)(env.deleteByIds),
              foods: foods(env.foods),
              log: (type, message) => appLog(type, message)(env.appLog),
            ),
          ),
          log: (type, message) => logUsecase.prepareLog(
                type,
                message,
              )(
                (type, message) => uiLog(type, message)(env.uiLog),
              )()
        );
