import '../application/app.dart';
import 'streams/foods.dart';
import 'use_cases/delete_foods_by_ids.dart';
import 'use_cases/log.dart';

final app = prepareApp(
  deleteByIds: prepareDeleteFoodsByIds,
  foods: prepareFoods,
  log: log,
);
