import 'commands/delete_foods_by_ids.dart';
import 'commands/execute.dart';
import 'commands/foods.dart';
import 'commands/log.dart';
import 'commands/retrieve.dart';
import 'flow/overview.dart';

abstract class App<RETRIEVE_PARAMS, EXECUTE_PARAMS> {
  App({
    required this.retrieve,
    required this.execute,
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

  final Retrieve<RETRIEVE_PARAMS> retrieve;
  final Execute<EXECUTE_PARAMS> execute;

  final OverviewControllerIO overview;
  final Log log;
}
