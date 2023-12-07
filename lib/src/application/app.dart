import 'commands/delete_foods_by_ids.dart';
import 'commands/foods.dart';
import 'commands/log.dart';
import 'flow/overview.dart';

abstract class App {
  App({
    required DeleteFoodsByIds deleteFoodsByIds,
    required Foods foods,
    required Log appLog,
    required Log uiLog,
  })  : overview = overviewControllerIO(
          (
            deleteByIds: deleteFoodsByIds,
            foods: foods,
            log: appLog,
          ),
        ),
        log = uiLog;

  final OverviewControllerIO overview;
  final Log log;
}
