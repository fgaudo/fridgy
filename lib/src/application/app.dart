import 'package:functionally/io.dart';
import 'package:functionally/reader.dart';

import 'controllers/overview.dart';
import 'use_cases/delete_foods_by_ids.dart';
import 'use_cases/foods.dart';
import 'use_cases/log.dart';

typedef App = ({IO<OverviewController> controller});

Reader<
    ({
      FOODS foodsEnv,
      DELETE deleteEnv,
      LOG logEnv,
    }),
    App> prepareApp<FOODS, DELETE, LOG>({
  required DeleteFoodsByIds<DELETE> deleteByIds,
  required Log<LOG> log,
  required Foods<FOODS> foods,
}) =>
    (env) => (
          controller: getControllerReaderIO(
            foods: foods,
            deleteByIds: deleteByIds,
            log: log,
          )(env)
        );
