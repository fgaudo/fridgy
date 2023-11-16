import '../application/controllers/overview.dart';
import 'commands/delete_foods_by_ids.dart';
import 'commands/log.dart';
import 'streams/foods.dart';

final overviewControllerReaderIO = getControllerReaderIO(
  deleteByIds: prepareDeleteFoodsByIds,
  foods: prepareFoods,
  log: log,
);
