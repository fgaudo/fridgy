import '../application/use_cases/overview.dart';
import 'logger/commands/log.dart';
import 'sqlite3/commands/delete_foods_by_ids.dart';
import 'sqlite3/streams/foods.dart';

final overviewControllerReaderIO = getControllerReaderIO(
  deleteByIds: prepareDeleteFoodsByIds(log: log),
  foods: prepareFoods(log),
  log: log,
);
