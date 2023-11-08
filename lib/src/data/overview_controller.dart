import '../application/use_cases/overview.dart';
import 'generic/commands/log.dart';
import 'sqlite3/commands/delete_foods_by_ids.dart';
import 'sqlite3/streams/foods.dart';

final controllerIOBuilder = prepareControllerBuilder(
  log: log,
  deleteByIds: deleteFoodsByIds,
  foods: foods,
);
