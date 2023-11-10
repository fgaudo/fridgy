import '../application/use_cases/overview.dart';
import 'logger/commands/log.dart';
import 'sqlite3/commands/delete_foods_by_ids.dart';
import 'sqlite3/streams/foods.dart';

final overviewControllerReaderIO = getControllerReaderIO(
  log: log,
  deleteFoodsByIds: prepareDeleteFoodsByIds(log),
  foods$R: prepareFoods$R(log),
);
